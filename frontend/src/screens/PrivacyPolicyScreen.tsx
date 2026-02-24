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

export default function PrivacyPolicyScreen({ navigation }: { navigation: any }) {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Feather name="arrow-left" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Privacy Policy</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.lastUpdated}>Last updated: December 2024</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. Introduction</Text>
          <Text style={styles.paragraph}>
            Kaam Deu ("we", "our", or "us") is committed to protecting your privacy.
            This Privacy Policy explains how we collect, use, disclose, and safeguard
            your information when you use our mobile application.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. Information We Collect</Text>
          <Text style={styles.subTitle}>Personal Information</Text>
          <Text style={styles.paragraph}>
            When you create an account, we may collect:
          </Text>
          <Text style={styles.bulletPoint}>• Name and contact information</Text>
          <Text style={styles.bulletPoint}>• Email address</Text>
          <Text style={styles.bulletPoint}>• Phone number</Text>
          <Text style={styles.bulletPoint}>• Profile photos</Text>
          <Text style={styles.bulletPoint}>• Employment history and skills</Text>
          <Text style={styles.bulletPoint}>• Location information</Text>

          <Text style={styles.subTitle}>Usage Information</Text>
          <Text style={styles.paragraph}>
            We automatically collect certain information when you use the App:
          </Text>
          <Text style={styles.bulletPoint}>• Device information (type, OS version)</Text>
          <Text style={styles.bulletPoint}>• App usage patterns and interactions</Text>
          <Text style={styles.bulletPoint}>• Log data and analytics</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>3. How We Use Your Information</Text>
          <Text style={styles.paragraph}>
            We use the collected information to:
          </Text>
          <Text style={styles.bulletPoint}>• Provide and maintain our services</Text>
          <Text style={styles.bulletPoint}>• Match workers with potential employers</Text>
          <Text style={styles.bulletPoint}>• Process and facilitate communications</Text>
          <Text style={styles.bulletPoint}>• Send notifications about matches and messages</Text>
          <Text style={styles.bulletPoint}>• Improve and personalize user experience</Text>
          <Text style={styles.bulletPoint}>• Ensure platform safety and security</Text>
          <Text style={styles.bulletPoint}>• Comply with legal obligations</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>4. Information Sharing</Text>
          <Text style={styles.paragraph}>
            We may share your information with:
          </Text>
          <Text style={styles.bulletPoint}>• Other users (profile information for matching)</Text>
          <Text style={styles.bulletPoint}>• Service providers who assist our operations</Text>
          <Text style={styles.bulletPoint}>• Law enforcement when required by law</Text>
          <Text style={styles.paragraph}>
            We do not sell your personal information to third parties.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>5. Data Security</Text>
          <Text style={styles.paragraph}>
            We implement appropriate technical and organizational measures to protect
            your personal information, including:
          </Text>
          <Text style={styles.bulletPoint}>• Encryption of data in transit and at rest</Text>
          <Text style={styles.bulletPoint}>• Secure authentication mechanisms</Text>
          <Text style={styles.bulletPoint}>• Regular security assessments</Text>
          <Text style={styles.bulletPoint}>• Access controls and monitoring</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>6. Your Rights</Text>
          <Text style={styles.paragraph}>
            You have the right to:
          </Text>
          <Text style={styles.bulletPoint}>• Access your personal data</Text>
          <Text style={styles.bulletPoint}>• Correct inaccurate information</Text>
          <Text style={styles.bulletPoint}>• Delete your account and associated data</Text>
          <Text style={styles.bulletPoint}>• Export your data</Text>
          <Text style={styles.bulletPoint}>• Opt-out of marketing communications</Text>
          <Text style={styles.bulletPoint}>• Control your privacy settings</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>7. Data Retention</Text>
          <Text style={styles.paragraph}>
            We retain your personal information for as long as your account is active
            or as needed to provide services. After account deletion, we may retain
            certain information for legal compliance, dispute resolution, and enforcement
            of our agreements.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>8. Children's Privacy</Text>
          <Text style={styles.paragraph}>
            Our App is not intended for users under 18 years of age. We do not knowingly
            collect personal information from children. If we discover that a child has
            provided us with personal information, we will delete it immediately.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>9. Third-Party Services</Text>
          <Text style={styles.paragraph}>
            Our App may contain links to third-party services. We are not responsible
            for the privacy practices of these external sites. We encourage you to
            review their privacy policies.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>10. Changes to This Policy</Text>
          <Text style={styles.paragraph}>
            We may update this Privacy Policy from time to time. We will notify you
            of any changes by posting the new policy in the App and updating the
            "Last updated" date. Your continued use of the App after changes indicates
            acceptance of the updated policy.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>11. Contact Us</Text>
          <Text style={styles.paragraph}>
            If you have questions or concerns about this Privacy Policy or our data
            practices, please contact us at:
          </Text>
          <Text style={styles.contactInfo}>privacy@kaamdeu.aghealthindustries.com</Text>
          <Text style={styles.contactInfo}>support@kaamdeu.aghealthindustries.com</Text>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            By using Kaam Deu, you consent to the collection and use of your information
            as described in this Privacy Policy.
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
  subTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
    marginTop: 12,
    marginBottom: 8,
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
