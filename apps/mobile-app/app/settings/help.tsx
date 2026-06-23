import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  MessageCircle,
  Phone,
  Mail,
  FileQuestion,
  ChevronRight,
} from 'lucide-react-native';
import { useTheme } from '../../src/contexts/ThemeContext';

interface HelpItemProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  onPress: () => void;
}

function HelpItem({ icon, title, description, onPress }: HelpItemProps) {
  const { colors } = useTheme();
  return (
    <TouchableOpacity style={[styles.helpItem, { borderTopColor: colors.borderLight }]} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.helpIcon, { backgroundColor: colors.inputBackground }]}>{icon}</View>
      <View style={styles.helpContent}>
        <Text style={[styles.helpTitle, { color: colors.text }]}>{title}</Text>
        <Text style={[styles.helpDescription, { color: colors.textSecondary }]}>{description}</Text>
      </View>
      <ChevronRight size={20} color={colors.textMuted} />
    </TouchableOpacity>
  );
}

export default function HelpScreen() {
  const router = useRouter();
  const { colors } = useTheme();

  const handleEmailSupport = () => {
    Linking.openURL('mailto:support@bucr.ng');
  };

  const handleCallSupport = () => {
    Linking.openURL('tel:+2341234567890');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Help & Support</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content}>
        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Get Help</Text>
          <HelpItem
            icon={<FileQuestion size={22} color={colors.primary} />}
            title="FAQs"
            description="Find answers to common questions"
            onPress={() => {}}
          />
          <HelpItem
            icon={<MessageCircle size={22} color={colors.tertiary} />}
            title="Live Chat"
            description="Chat with our support team"
            onPress={() => {}}
          />
          <HelpItem
            icon={<Mail size={22} color={colors.info} />}
            title="Email Support"
            description="Send us an email at support@bucr.ng"
            onPress={handleEmailSupport}
          />
          <HelpItem
            icon={<Phone size={22} color={colors.warning} />}
            title="Call Us"
            description="Mon-Fri, 9AM-6PM WAT"
            onPress={handleCallSupport}
          />
        </View>

        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Popular Topics</Text>
          <TouchableOpacity style={[styles.topicItem, { borderTopColor: colors.borderLight }]}>
            <Text style={[styles.topicText, { color: colors.text }]}>How to make a reservation</Text>
            <ChevronRight size={20} color={colors.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.topicItem, { borderTopColor: colors.borderLight }]}>
            <Text style={[styles.topicText, { color: colors.text }]}>Understanding credits</Text>
            <ChevronRight size={20} color={colors.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.topicItem, { borderTopColor: colors.borderLight }]}>
            <Text style={[styles.topicText, { color: colors.text }]}>Cancellation policy</Text>
            <ChevronRight size={20} color={colors.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.topicItem, { borderTopColor: colors.borderLight }]}>
            <Text style={[styles.topicText, { color: colors.text }]}>Refund process</Text>
            <ChevronRight size={20} color={colors.textMuted} />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  section: {
    marginTop: 20,
    borderTopWidth: 1,
    borderBottomWidth: 1,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  helpItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderTopWidth: 1,
  },
  helpIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  helpContent: {
    flex: 1,
  },
  helpTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  helpDescription: {
    fontSize: 13,
  },
  topicItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderTopWidth: 1,
  },
  topicText: {
    fontSize: 15,
  },
});
