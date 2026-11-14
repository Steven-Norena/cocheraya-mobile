import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  SafeAreaView,
  Alert,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Send, MessageSquare, ShieldAlert, ArrowLeft } from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import reservationService, { ReservationResponse } from '../../services/reservationService';
import api from '../../services/api';

interface ChatMessage {
  id: number;
  reservationId: number;
  senderId: number;
  senderName: string;
  senderEmail: string;
  content: string;
  createdAt: string;
}

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const reservationId = parseInt(id || '0', 10);
  const router = useRouter();
  const { user } = useAuth();

  const [reservation, setReservation] = useState<ReservationResponse | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);

  const flatListRef = useRef<FlatList<ChatMessage>>(null);

  // Fetch reservation details to determine if it is active/pending and get title
  const fetchReservationDetails = useCallback(async () => {
    if (!reservationId) return;
    try {
      const data = await reservationService.getDetails(reservationId);
      setReservation(data);
    } catch (error) {
      console.error('Error fetching reservation details in Chat:', error);
    }
  }, [reservationId]);

  // Fetch chat messages
  const fetchMessages = useCallback(async (showLoading = false) => {
    if (!reservationId) return;
    if (showLoading) setLoading(true);
    try {
      const response = await api.get<ChatMessage[]>(`/reservations/${reservationId}/messages`);
      setMessages(response.data);
    } catch (error) {
      console.error('Error fetching chat messages:', error);
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [reservationId]);

  // Initial load
  useEffect(() => {
    fetchReservationDetails();
    fetchMessages(true);
  }, [fetchReservationDetails, fetchMessages]);

  // Poll for new messages and status changes every 3 seconds (real-time coordinate)
  useEffect(() => {
    if (!reservationId) return;

    const interval = setInterval(() => {
      fetchMessages(false);
      // Fetch reservation details as well, to check if status becomes FINISHED/CANCELLED
      fetchReservationDetails();
    }, 3000);

    return () => clearInterval(interval);
  }, [reservationId, fetchMessages, fetchReservationDetails]);

  // Scroll to bottom when message list updates
  const scrollToBottom = () => {
    if (messages.length > 0) {
      flatListRef.current?.scrollToEnd({ animated: true });
    }
  };

  const handleSend = async () => {
    if (!newMessage.trim() || !reservationId || sending) return;

    const contentToSend = newMessage.trim();
    setNewMessage('');
    setSending(true);
    try {
      const response = await api.post<ChatMessage>(`/reservations/${reservationId}/messages`, {
        content: contentToSend,
      });
      setMessages((prev) => [...prev, response.data]);
      setTimeout(scrollToBottom, 100);
    } catch (error) {
      console.error('Error sending message:', error);
      // Put message back if it failed to send
      setNewMessage(contentToSend);
    } finally {
      setSending(false);
    }
  };

  const isReadOnly = reservation ? reservation.status !== 'PENDING' && reservation.status !== 'ACTIVE' : false;

  const handleLongPressMessage = async (content: string) => {
    try {
      await Clipboard.setStringAsync(content);
      Alert.alert('Copiado', 'El mensaje se ha copiado al portapapeles.');
    } catch (err) {
      console.error('Error copying text to clipboard:', err);
    }
  };

  const renderItem = ({ item }: { item: ChatMessage }) => {
    const isMe = item.senderId === user?.userId;
    const time = new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    return (
      <View style={[styles.messageRow, isMe ? styles.messageRowRight : styles.messageRowLeft]}>
        {!isMe && (
          <Text style={styles.senderNameLabel}>{item.senderName}</Text>
        )}
        <TouchableOpacity
          activeOpacity={0.85}
          onLongPress={() => handleLongPressMessage(item.content)}
          style={[styles.bubble, isMe ? styles.bubbleRight : styles.bubbleLeft]}
        >
          <Text selectable={true} style={styles.messageText}>{item.content}</Text>
          <Text style={styles.messageTime}>{time}</Text>
        </TouchableOpacity>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#a855f7" />
        <Text style={styles.loadingText}>Cargando conversación...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Custom Header to match premium design and show Back button + Space Title */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={22} color="#f8fafc" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {reservation?.parkingSpace.title || 'Chat de Reserva'}
          </Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>
            {reservation ? (
              reservation.status === 'PENDING' ? 'Reserva Pendiente' :
              reservation.status === 'ACTIVE' ? 'Reserva Activa' :
              reservation.status === 'FINISHED' ? 'Finalizada (Solo lectura)' :
              reservation.status === 'CANCELLED' ? 'Cancelada (Solo lectura)' : 'Expirada (Solo lectura)'
            ) : ''}
          </Text>
        </View>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        style={styles.keyboardContainer}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          onContentSizeChange={scrollToBottom}
          onLayout={scrollToBottom}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MessageSquare size={50} color="#374151" style={{ marginBottom: 12 }} />
              <Text style={styles.emptyTitle}>Chat de Coordinación</Text>
              <Text style={styles.emptySubtitle}>
                Usa este espacio para coordinar la llegada, portón, llaves o compartir el código manual.
              </Text>
            </View>
          }
        />

        {isReadOnly ? (
          <View style={styles.readOnlyContainer}>
            <ShieldAlert size={18} color="#94a3b8" style={{ marginRight: 8 }} />
            <Text style={styles.readOnlyText}>
              Este chat ha finalizado y ahora es de solo lectura.
            </Text>
          </View>
        ) : (
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.textInput}
              placeholder="Escribe un mensaje..."
              placeholderTextColor="#64748b"
              value={newMessage}
              onChangeText={setNewMessage}
              multiline
              maxLength={1000}
              editable={!sending}
            />
            <TouchableOpacity
              style={[styles.sendButton, !newMessage.trim() && styles.sendButtonDisabled]}
              onPress={handleSend}
              disabled={!newMessage.trim() || sending}
            >
              {sending ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Send size={18} color="#ffffff" />
              )}
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b0c10',
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0b0c10',
  },
  loadingText: {
    color: '#94a3b8',
    marginTop: 12,
    fontSize: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0b0c10',
    borderBottomWidth: 1,
    borderBottomColor: '#1f2937',
    paddingVertical: 12,
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 40 : 12, // simple top safe spacing for Android
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerTitle: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '700',
  },
  headerSubtitle: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 2,
  },
  keyboardContainer: {
    flex: 1,
  },
  listContent: {
    padding: 16,
    paddingBottom: 24,
    flexGrow: 1,
  },
  messageRow: {
    marginVertical: 6,
    maxWidth: '80%',
  },
  messageRowRight: {
    alignSelf: 'flex-end',
    alignItems: 'flex-end',
  },
  messageRowLeft: {
    alignSelf: 'flex-start',
    alignItems: 'flex-start',
  },
  senderNameLabel: {
    color: '#64748b',
    fontSize: 11,
    marginBottom: 2,
    marginLeft: 4,
  },
  bubble: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 14,
  },
  bubbleRight: {
    backgroundColor: '#a855f7',
    borderBottomRightRadius: 2,
  },
  bubbleLeft: {
    backgroundColor: '#1e293b',
    borderBottomLeftRadius: 2,
    borderWidth: 1,
    borderColor: '#334155',
  },
  messageText: {
    color: '#f8fafc',
    fontSize: 14,
    lineHeight: 20,
  },
  messageTime: {
    color: 'rgba(248, 250, 252, 0.6)',
    fontSize: 9,
    alignSelf: 'flex-end',
    marginTop: 4,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
    marginTop: 60,
  },
  emptyTitle: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
  },
  emptySubtitle: {
    color: '#94a3b8',
    textAlign: 'center',
    fontSize: 13,
    lineHeight: 18,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#1f2937',
    backgroundColor: '#0b0c10',
  },
  textInput: {
    flex: 1,
    backgroundColor: '#111318',
    borderWidth: 1,
    borderColor: '#1f2937',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    paddingTop: 8, // needed for multi-line vertical center alignment
    color: '#f8fafc',
    fontSize: 14,
    maxHeight: 100,
    marginRight: 12,
  },
  sendButton: {
    backgroundColor: '#a855f7',
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#374151',
    opacity: 0.5,
  },
  readOnlyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1c1917',
    borderTopWidth: 1,
    borderTopColor: '#292524',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  readOnlyText: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '500',
  },
});
