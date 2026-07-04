import { Alert, Platform } from 'react-native';

// react-native-web ships Alert.alert as a literal no-op (`static alert() {}`),
// so on web every error message was invisible and multi-button confirms
// (unmatch/block in chat) could never fire their onPress. Patch the shared
// Alert singleton once at startup; every existing call site picks it up.
// Imported for its side effect from app/_layout.jsx.
if (Platform.OS === 'web') {
  Alert.alert = (title, message, buttons) => {
    const text = [title, message].filter(Boolean).join('\n\n');
    if (!buttons || buttons.length === 0) {
      window.alert(text);
      return;
    }
    if (buttons.length === 1) {
      window.alert(text);
      buttons[0]?.onPress?.();
      return;
    }
    // window.confirm can only offer OK/Cancel: OK maps to the first
    // non-cancel button, Cancel to the cancel-styled one (if any).
    const confirmBtn = buttons.find(b => b?.style !== 'cancel') ?? buttons[buttons.length - 1];
    const cancelBtn = buttons.find(b => b?.style === 'cancel');
    if (window.confirm(text)) confirmBtn?.onPress?.();
    else cancelBtn?.onPress?.();
  };
}
