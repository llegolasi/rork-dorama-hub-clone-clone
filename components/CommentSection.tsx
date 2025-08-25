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
  ScrollView
} from "react-native";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Send, Flag } from "lucide-react-native";
import ReportCommentModal from './ReportCommentModal';

import { COLORS } from "@/constants/colors";

// Mock data for comments
interface Comment {
  id: string;
  username: string;
  text: string;
  timestamp: string;
  isOwnComment?: boolean;
}

const MOCK_COMMENTS: Comment[] = [
  {
    id: "1",
    username: "k_drama_lover",
    text: "This is one of my all-time favorites! The chemistry between the leads is incredible.",
    timestamp: "2 days ago",
    isOwnComment: false
  },
  {
    id: "2",
    username: "seoul_searcher",
    text: "I couldn't stop watching this one. Binged it in two days!",
    timestamp: "1 week ago",
    isOwnComment: false
  },
  {
    id: "3",
    username: "drama_queen",
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
  
  // Android-specific optimizations
  const androidInputProps = Platform.OS === 'android' ? {
    underlineColorAndroid: 'transparent',
    selectionColor: COLORS.accent,
    autoCorrect: true,
    autoCapitalize: 'sentences' as const,
  } : {};
  
  const handleSubmitComment = () => {
    if (!newComment.trim()) return;
    
    setIsSubmitting(true);
    
    // Simulate API call
    setTimeout(() => {
      const comment: Comment = {
        id: Date.now().toString(),
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
                <View style={styles.commentHeader}>
                  <View style={styles.commentHeaderLeft}>
                    <Text style={styles.username}>{comment.username}</Text>
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
          // Ensure input container has proper background and shadow
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
    paddingHorizontal: 16,
  },
  commentItem: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
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