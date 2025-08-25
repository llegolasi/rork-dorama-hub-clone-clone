import React, { useMemo, useState } from "react";
import { 
  ActivityIndicator, 
  KeyboardAvoidingView, 
  Platform, 
  StyleSheet, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  View, 
  ScrollView,
  Image
} from "react-native";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Send, Flag } from "lucide-react-native";
import { router } from 'expo-router';
import ReportCommentModal from './ReportCommentModal';

import { COLORS } from "@/constants/colors";

interface Comment {
  id: string;
  userId: string;
  username: string;
  profileImage?: string;
  text: string;
  timestamp: string;
  isOwnComment?: boolean;
}

const MOCK_COMMENTS: Comment[] = [
  {
    id: "1",
    userId: "user1",
    username: "k_drama_lover",
    profileImage: "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face",
    text: "This is one of my all-time favorites! The chemistry between the leads is incredible.",
    timestamp: "2 days ago",
    isOwnComment: false
  },
  {
    id: "2",
    userId: "user2",
    username: "seoul_searcher",
    profileImage: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face",
    text: "I couldn't stop watching this one. Binged it in two days!",
    timestamp: "1 week ago",
    isOwnComment: false
  },
  {
    id: "3",
    userId: "user3",
    username: "drama_queen",
    profileImage: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face",
    text: "The soundtrack is amazing. I've been listening to it on repeat.",
    timestamp: "2 weeks ago",
    isOwnComment: false
  }
];

interface CommentSectionProps {
  dramaId: number;
}

export default function CommentSection({ dramaId }: CommentSectionProps) {
  const insets = useSafeAreaInsets();
  const [comments, setComments] = useState<Comment[]>(MOCK_COMMENTS);
  const [newComment, setNewComment] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [reportModalVisible, setReportModalVisible] = useState<boolean>(false);
  const [selectedComment, setSelectedComment] = useState<Comment | null>(null);

  const bottomPadding = useMemo(() => (insets.bottom > 0 ? insets.bottom : 12), [insets.bottom]);
  const keyboardOffset = useMemo(() => {
    return Platform.OS === 'ios' ? insets.bottom : 0;
  }, [insets.bottom]);
  
  const androidInputProps = Platform.OS === 'android' ? {
    underlineColorAndroid: 'transparent',
    selectionColor: COLORS.accent,
    autoCorrect: true,
    autoCapitalize: 'sentences' as const,
  } : {};
  
  const handleSubmitComment = () => {
    if (!newComment.trim()) return;
    
    setIsSubmitting(true);
    
    setTimeout(() => {
      const comment: Comment = {
        id: Date.now().toString(),
        userId: "current-user",
        username: "you",
        text: newComment.trim(),
        timestamp: "Just now",
        isOwnComment: true
      };
      
      setComments([comment, ...comments]);
      setNewComment("");
      setIsSubmitting(false);
    }, 500);
  };

  const handleReportComment = (comment: Comment) => {
    setSelectedComment(comment);
    setReportModalVisible(true);
  };

  const handleCloseReportModal = () => {
    setReportModalVisible(false);
    setSelectedComment(null);
  };

  const handleProfilePress = (userId: string) => {
    router.push(`/user/${userId}`);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={keyboardOffset}
      style={styles.container}
    >
      <Text style={styles.title}>Comments</Text>
      
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPadding + 120 }]}
        keyboardShouldPersistTaps="handled"
      >
        {comments.length > 0 ? (
          <View style={styles.commentsContainer}>
            {comments.map((comment) => (
              <View key={comment.id} style={styles.commentItem}>
                <View style={styles.commentRow}>
                  <TouchableOpacity
                    onPress={() => handleProfilePress(comment.userId)}
                    style={styles.profileImageContainer}
                  >
                    <Image
                      source={{
                        uri: comment.profileImage || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face'
                      }}
                      style={styles.profileImage}
                    />
                  </TouchableOpacity>
                  
                  <View style={styles.commentContent}>
                    <View style={styles.commentHeader}>
                      <View style={styles.commentHeaderLeft}>
                        <TouchableOpacity onPress={() => handleProfilePress(comment.userId)}>
                          <Text style={styles.username}>{comment.username}</Text>
                        </TouchableOpacity>
                        <Text style={styles.timestamp}>{comment.timestamp}</Text>
                      </View>
                      {!comment.isOwnComment && (
                        <TouchableOpacity
                          style={styles.moreButton}
                          onPress={() => handleReportComment(comment)}
                          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                          <Flag size={16} color={COLORS.textSecondary} />
                        </TouchableOpacity>
                      )}
                    </View>
                    <Text style={styles.commentText}>{comment.text}</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Be the first to comment!</Text>
          </View>
        )}
      </ScrollView>

      <View style={[
        styles.inputContainer, 
        Platform.OS === 'android' && styles.inputContainerAndroid,
        { 
          paddingBottom: Platform.OS === 'android' ? (insets.bottom > 0 ? insets.bottom : 8) : bottomPadding,
          position: Platform.OS === 'android' ? 'absolute' : 'relative',
          bottom: Platform.OS === 'android' ? insets.bottom : undefined,
          left: Platform.OS === 'android' ? 0 : undefined,
          right: Platform.OS === 'android' ? 0 : undefined,
          backgroundColor: COLORS.card,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          elevation: 8,
        }
      ]}>
        <TextInput
          style={[
            styles.input,
            Platform.OS === 'android' && styles.inputAndroid
          ]}
          placeholder="Add a comment..."
          placeholderTextColor={COLORS.textSecondary}
          value={newComment}
          onChangeText={setNewComment}
          multiline
          maxLength={500}
          testID="comment-input"
          textAlignVertical={Platform.OS === 'android' ? 'top' : 'center'}
          returnKeyType={Platform.OS === 'android' ? 'default' : 'send'}
          blurOnSubmit={Platform.OS === 'android' ? true : false}
          {...androidInputProps}
        />
        
        <TouchableOpacity
          style={[
            styles.submitButton,
            (!newComment.trim() || isSubmitting) && styles.submitButtonDisabled
          ]}
          onPress={handleSubmitComment}
          disabled={!newComment.trim() || isSubmitting}
          activeOpacity={0.7}
          testID="submit-comment"
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color={COLORS.text} />
          ) : (
            <Send size={18} color={COLORS.text} />
          )}
        </TouchableOpacity>
      </View>

      {selectedComment && (
        <ReportCommentModal
          visible={reportModalVisible}
          onClose={handleCloseReportModal}
          commentId={selectedComment.id}
          commentType="ranking"
          commentContent={selectedComment.text}
          onReportSubmitted={() => {
            console.log('Comment reported successfully');
          }}
        />
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    marginTop: 24,
  },
  title: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: COLORS.card,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  input: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: Platform.OS === 'android' ? 14 : 12,
    color: COLORS.text,
    fontSize: 14,
    minHeight: Platform.OS === 'android' ? 52 : 48,
    maxHeight: Platform.OS === 'android' ? 120 : 100,
  },
  inputAndroid: {
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
    paddingTop: 14,
    paddingBottom: 14,
    lineHeight: 18,
  },
  inputContainerAndroid: {
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  submitButton: {
    backgroundColor: COLORS.accent,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  commentsContainer: {
    gap: 12,
  },
  commentRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  profileImageContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: "hidden",
  },
  profileImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  commentContent: {
    flex: 1,
  },
  commentItem: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 12,
  },
  commentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  commentHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  moreButton: {
    padding: 4,
    borderRadius: 4,
  },
  username: {
    color: COLORS.text,
    fontWeight: "600",
    fontSize: 14,
  },
  timestamp: {
    color: COLORS.textSecondary,
    fontSize: 12,
  },
  commentText: {
    color: COLORS.text,
    fontSize: 14,
    lineHeight: 20,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 24,
  },
  emptyText: {
    color: COLORS.textSecondary,
    fontSize: 14,
  },
});