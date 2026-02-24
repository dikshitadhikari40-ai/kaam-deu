import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { theme } from '../theme';

export default function TermsOfServiceScreen({ navigation }: { navigation: any }) {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Feather name="arrow-left" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Terms of Service</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.lastUpdated}>Last updated: December 2024</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. Acceptance of Terms</Text>
          <Text style={styles.paragraph}>
            By accessing or using Kaam Deu ("the App"), you agree to be bound by these Terms of Service.
            If you do not agree to these terms, please do not use the App.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. Description of Service</Text>
          <Text style={styles.paragraph}>
            Kaam Deu is a job matching platform that connects workers with businesses in Nepal.
            The App provides a platform for workers to showcase their skills and for businesses
            to find suitable candidates for their job openings.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>3. User Accounts</Text>
          <Text style={styles.paragraph}>
            To use certain features of the App, you must create an account. You are responsible for:
          </Text>
          <Text style={styles.bulletPoint}>• Maintaining the confidentiality of your account credentials</Text>
          <Text style={styles.bulletPoint}>• All activities that occur under your account</Text>
          <Text style={styles.bulletPoint}>• Providing accurate and complete information</Text>
          <Text style={styles.bulletPoint}>• Updating your information to keep it current</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>4. User Conduct</Text>
          <Text style={styles.paragraph}>
            You agree not to:
          </Text>
          <Text style={styles.bulletPoint}>• Use the App for any illegal purpose</Text>
          <Text style={styles.bulletPoint}>• Harass, abuse, or harm other users</Text>
          <Text style={styles.bulletPoint}>• Post false, misleading, or fraudulent content</Text>
          <Text style={styles.bulletPoint}>• Impersonate any person or entity</Text>
          <Text style={styles.bulletPoint}>• Interfere with the proper functioning of the App</Text>
          <Text style={styles.bulletPoint}>• Attempt to gain unauthorized access to our systems</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>5. Content Guidelines</Text>
          <Text style={styles.paragraph}>
            Users are solely responsible for the content they post. Content must not:
          </Text>
          <Text style={styles.bulletPoint}>• Violate any applicable laws or regulations</Text>
          <Text style={styles.bulletPoint}>• Contain hate speech or discriminatory content</Text>
          <Text style={styles.bulletPoint}>• Include explicit or inappropriate material</Text>
          <Text style={styles.bulletPoint}>• Infringe on intellectual property rights</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>6. Privacy</Text>
          <Text style={styles.paragraph}>
            Your privacy is important to us. Please review our Privacy Policy to understand
            how we collect, use, and protect your personal information.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>7. Termination</Text>
          <Text style={styles.paragraph}>
            We reserve the right to suspend or terminate your account at any time for violations
            of these Terms or for any other reason at our sole discretion. You may also delete
            your account at any time through the App settings.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>8. Disclaimers</Text>
          <Text style={styles.paragraph}>
            The App is provided "as is" without warranties of any kind. We do not guarantee:
          </Text>
          <Text style={styles.bulletPoint}>• The accuracy of user-provided information</Text>
          <Text style={styles.bulletPoint}>• Successful job matches or employment outcomes</Text>
          <Text style={styles.bulletPoint}>• Uninterrupted or error-free service</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>9. Limitation of Liability</Text>
          <Text style={styles.paragraph}>
            To the maximum extent permitted by law, Kaam Deu shall not be liable for any
            indirect, incidental, special, consequential, or punitive damages arising from
            your use of the App.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>10. Changes to Terms</Text>
          <Text style={styles.paragraph}>
            We may update these Terms from time to time. We will notify you of any significant
            changes by posting the new Terms in the App. Your continued use of the App after
            such changes constitutes acceptance of the new Terms.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>11. Contact Us</Text>
          <Text style={styles.paragraph}>
            If you have any questions about these Terms, please contact us at:
          </Text>
          <Text style={styles.contactInfo}>support@kaamdeu.aghealthindustries.com</Text>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            By using Kaam Deu, you acknowledge that you have read, understood, and agree
            to be bound by these Terms of Service.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
  },
  placeholder: {
    width: 40,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  lastUpdated: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginBottom: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 12,
  },
  paragraph: {
    fontSize: 14,
    lineHeight: 22,
    color: theme.colors.textSecondary,
    marginBottom: 8,
  },
  bulletPoint: {
    fontSize: 14,
    lineHeight: 24,
    color: theme.colors.textSecondary,
    paddingLeft: 8,
  },
  contactInfo: {
    fontSize: 14,
    color: theme.colors.accent,
    marginTop: 8,
  },
  footer: {
    marginTop: 16,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  footerText: {
    fontSize: 12,
    lineHeight: 18,
    color: theme.colors.textSecondary,
    fontStyle: 'italic',
  },
});
