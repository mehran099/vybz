import { supabase } from "@/integrations/supabase/client";

export interface CallParticipant {
  id: string;
  username: string;
  display_color: string;
}

export type CallType = 'audio' | 'video';

export class WebRTCManager {
  private peerConnection: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private callChannel: any = null;
  private callId: string;
  private isInitiator: boolean;
  private onRemoteStreamCallback?: (stream: MediaStream) => void;
  private onCallEndCallback?: () => void;

  constructor(callId: string, isInitiator: boolean) {
    this.callId = callId;
    this.isInitiator = isInitiator;
  }

  async initialize(
    callType: CallType,
    onRemoteStream: (stream: MediaStream) => void,
    onCallEnd: () => void
  ) {
    this.onRemoteStreamCallback = onRemoteStream;
    this.onCallEndCallback = onCallEnd;

    // Get user media
    const constraints: MediaStreamConstraints = {
      audio: true,
      video: callType === 'video' ? {
        width: { ideal: 1280 },
        height: { ideal: 720 }
      } : false
    };

    try {
      this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
    } catch (error) {
      console.error('Error accessing media devices:', error);
      throw new Error('Failed to access camera/microphone');
    }

    // Create peer connection
    this.peerConnection = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    });

    // Add local stream tracks
    this.localStream.getTracks().forEach(track => {
      if (this.peerConnection && this.localStream) {
        this.peerConnection.addTrack(track, this.localStream);
      }
    });

    // Handle remote stream
    this.peerConnection.ontrack = (event) => {
      console.log('Received remote track:', event);
      if (!this.remoteStream) {
        this.remoteStream = new MediaStream();
      }
      event.streams[0].getTracks().forEach(track => {
        this.remoteStream?.addTrack(track);
      });
      if (this.onRemoteStreamCallback) {
        this.onRemoteStreamCallback(this.remoteStream);
      }
    };

    // Handle ICE candidates
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        this.sendSignal({
          type: 'ice-candidate',
          candidate: event.candidate
        });
      }
    };

    // Handle connection state changes
    this.peerConnection.onconnectionstatechange = () => {
      console.log('Connection state:', this.peerConnection?.connectionState);
      if (this.peerConnection?.connectionState === 'disconnected' ||
          this.peerConnection?.connectionState === 'failed' ||
          this.peerConnection?.connectionState === 'closed') {
        this.cleanup();
        if (this.onCallEndCallback) {
          this.onCallEndCallback();
        }
      }
    };

    // Subscribe to signaling channel
    this.callChannel = supabase
      .channel(`call:${this.callId}`)
      .on('broadcast', { event: 'signal' }, async ({ payload }) => {
        await this.handleSignal(payload);
      })
      .subscribe();

    // If initiator, create offer
    if (this.isInitiator) {
      await this.createOffer();
    }

    return this.localStream;
  }

  private async createOffer() {
    if (!this.peerConnection) return;

    try {
      const offer = await this.peerConnection.createOffer();
      await this.peerConnection.setLocalDescription(offer);
      
      this.sendSignal({
        type: 'offer',
        sdp: offer.sdp
      });
    } catch (error) {
      console.error('Error creating offer:', error);
    }
  }

  private async handleSignal(signal: any) {
    if (!this.peerConnection) return;

    try {
      if (signal.type === 'offer') {
        await this.peerConnection.setRemoteDescription(
          new RTCSessionDescription({ type: 'offer', sdp: signal.sdp })
        );
        
        const answer = await this.peerConnection.createAnswer();
        await this.peerConnection.setLocalDescription(answer);
        
        this.sendSignal({
          type: 'answer',
          sdp: answer.sdp
        });
      } else if (signal.type === 'answer') {
        await this.peerConnection.setRemoteDescription(
          new RTCSessionDescription({ type: 'answer', sdp: signal.sdp })
        );
      } else if (signal.type === 'ice-candidate') {
        await this.peerConnection.addIceCandidate(
          new RTCIceCandidate(signal.candidate)
        );
      }
    } catch (error) {
      console.error('Error handling signal:', error);
    }
  }

  private sendSignal(signal: any) {
    if (this.callChannel) {
      this.callChannel.send({
        type: 'broadcast',
        event: 'signal',
        payload: signal
      });
    }
  }

  toggleAudio(enabled: boolean) {
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach(track => {
        track.enabled = enabled;
      });
    }
  }

  toggleVideo(enabled: boolean) {
    if (this.localStream) {
      this.localStream.getVideoTracks().forEach(track => {
        track.enabled = enabled;
      });
    }
  }

  async endCall() {
    this.cleanup();
    if (this.onCallEndCallback) {
      this.onCallEndCallback();
    }
  }

  private cleanup() {
    // Stop local stream
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }

    // Close peer connection
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }

    // Unsubscribe from channel
    if (this.callChannel) {
      supabase.removeChannel(this.callChannel);
      this.callChannel = null;
    }
  }

  getLocalStream() {
    return this.localStream;
  }

  getRemoteStream() {
    return this.remoteStream;
  }
}
