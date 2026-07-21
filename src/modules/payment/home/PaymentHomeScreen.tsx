import { StyleSheet, Text, View } from 'react-native';

/**
 * Payment feature placeholder (kiosk payments).
 */
export function PaymentHomeScreen() {
  return (
    <View style={styles.container} testID="payment-home">
      <Text style={styles.title}>Payment</Text>
      <Text style={styles.subtitle}>Payment module</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: '600',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    opacity: 0.7,
  },
});
