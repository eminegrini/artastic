import React, { useState } from "react";
import { useTheme, getThemeColors } from "../context/ThemeContext";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "../services/supabaseClient";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import packageJson from "../package.json"; // Importa el archivo package.json

export default function LoginScreen() {
  const navigation = useNavigation();
  const { isDarkMode } = useTheme();
  const colors = getThemeColors(isDarkMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({
    email: "",
    password: "",
    general: "",
  });
  const [passwordVisible, setPasswordVisible] = useState(false);

  // Validar email
  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) {
      return "El email es obligatorio";
    } else if (!emailRegex.test(email)) {
      return "Ingresa un email válido";
    }
    return "";
  };

  // Validar contraseña
  const validatePassword = (password) => {
    if (!password) {
      return "La contraseña es obligatoria";
    } else if (password.length < 6) {
      return "La contraseña debe tener al menos 6 caracteres";
    }
    return "";
  };

  // Manejar cambio de email
  const handleEmailChange = (text) => {
    setEmail(text);
    if (errors.email) {
      setErrors({ ...errors, email: "" });
    }
  };

  // Manejar cambio de contraseña
  const handlePasswordChange = (text) => {
    setPassword(text);
    if (errors.password) {
      setErrors({ ...errors, password: "" });
    }
  };

  const togglePasswordVisibility = () => {
    setPasswordVisible(!passwordVisible);
  };

  // Interpretar errores de Supabase
  const getErrorMessage = (error) => {
    console.log("Error code:", error.code, "Message:", error.message);

    // Mapear códigos de error comunes a mensajes amigables
    const errorMessages = {
      "auth/invalid-email": "El formato del email no es válido",
      "auth/user-not-found": "No existe una cuenta con este email",
      "auth/wrong-password": "La contraseña es incorrecta",
      "auth/invalid-login-credentials": "Email o contraseña incorrectos",
      "auth/too-many-requests":
        "Demasiados intentos fallidos. Inténtalo más tarde",
      "auth/user-disabled": "Esta cuenta ha sido deshabilitada",
      23505: "Ya existe una cuenta con este email",
    };

    // Verificar mensajes de error por contenido
    if (error.message?.includes("Invalid login credentials")) {
      return "Email o contraseña incorrectos";
    }

    if (error.message?.includes("Email not confirmed")) {
      return "Por favor confirma tu email antes de iniciar sesión";
    }

    // Usar el mensaje mapeado o un mensaje genérico como respaldo
    return (
      errorMessages[error.code] || "Ha ocurrido un error al iniciar sesión"
    );
  };

  const handleSignIn = async () => {
    // Validar campos antes de intentar iniciar sesión
    const emailError = validateEmail(email);
    const passwordError = validatePassword(password);

    if (emailError || passwordError) {
      setErrors({
        email: emailError,
        password: passwordError,
        general: "",
      });
      return;
    }

    try {
      setLoading(true);
      setErrors({ email: "", password: "", general: "" });

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw error;
      }

      // Redirect to the HomeScreen
      navigation.reset({
        index: 0,
        routes: [{ name: "Root" }],
      });
    } catch (error) {
      console.error("Error signing in:", error);
      const errorMessage = getErrorMessage(error);

      // Determinar si es un error de email, contraseña o general
      if (errorMessage.toLowerCase().includes("email")) {
        setErrors({ ...errors, email: errorMessage });
      } else if (errorMessage.toLowerCase().includes("contraseña")) {
        setErrors({ ...errors, password: errorMessage });
      } else {
        setErrors({ ...errors, general: errorMessage });
      }
    } finally {
      setLoading(false);
    }
  };
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <SafeAreaView style={styles.inner}>
          <View style={styles.logoContainer}>
            <Image source={require("../assets/logo.png")} style={styles.logo} />
            <Text style={styles.subtitle}>Gestión de impresiones 3D</Text>
          </View>

          <View style={styles.formContainer}>
            {errors.general ? (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={18} color={colors.error} />
                <Text style={[styles.errorText, { color: colors.error }]}>
                  {errors.general}
                </Text>
              </View>
            ) : null}

            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>
                Email
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.card,
                    color: colors.text,
                    borderColor: errors.email ? colors.error : colors.border,
                    borderWidth: errors.email ? 1 : 1,
                  },
                ]}
                placeholder="ejemplo@correo.com"
                value={email}
                onChangeText={handleEmailChange}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
              />
              {errors.email && (
                <Text style={[styles.fieldErrorText, { color: colors.error }]}>
                  {errors.email}
                </Text>
              )}
            </View>

            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>
                Contraseña
              </Text>
              <View
                style={[
                  styles.passwordContainer,
                  {
                    backgroundColor: colors.card,
                    borderColor: errors.password ? colors.error : colors.border,
                    borderWidth: errors.password ? 1 : 1,
                  },
                ]}
              >
                <TextInput
                  style={[styles.passwordInput, { color: colors.text }]}
                  placeholder="Tu contraseña"
                  value={password}
                  onChangeText={handlePasswordChange}
                  secureTextEntry={!passwordVisible}
                  autoComplete="password"
                />
                <TouchableOpacity
                  onPress={togglePasswordVisibility}
                  style={styles.eyeIcon}
                >
                  <Ionicons
                    name={passwordVisible ? "eye-off" : "eye"}
                    size={20}
                    color={colors.textTertiary}
                  />
                </TouchableOpacity>
              </View>
              {errors.password && (
                <Text style={[styles.fieldErrorText, { color: colors.error }]}>
                  {errors.password}
                </Text>
              )}
            </View>

            <TouchableOpacity style={styles.forgotPassword}>
              <Text
                style={[styles.forgotPasswordText, { color: colors.primary }]}
              >
                ¿Olvidaste tu contraseña?
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.loginButton,
                {
                  backgroundColor: loading
                    ? colors.primary + "80"
                    : colors.primary,
                  opacity: loading ? 0.8 : 1,
                },
              ]}
              onPress={handleSignIn}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <Text style={styles.loginButtonText}>Iniciar Sesión</Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: colors.textTertiary }]}>
              Artastic 3D © {new Date().getFullYear()}
            </Text>
            <Text style={[styles.versionText, { color: colors.textTertiary }]}>
              v{packageJson.version}
            </Text>
          </View>
        </SafeAreaView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7F8FC",
  },
  inner: {
    flex: 1,
    padding: 24,
    justifyContent: "space-between",
  },
  logoContainer: {
    alignItems: "center",
    marginTop: 40,
  },
  logo: {
    width: 300,
    borderRadius: 20,
    height: 100,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
  },
  formContainer: {
    marginVertical: 30,
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(244, 67, 54, 0.1)",
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    color: "#F44336",
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    color: "#666",
    marginBottom: 8,
    fontWeight: "500",
  },
  input: {
    backgroundColor: "white",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#EAEAEA",
  },
  passwordContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#EAEAEA",
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  },
  eyeIcon: {
    padding: 10,
  },
  fieldErrorText: {
    color: "#F44336",
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
  forgotPassword: {
    alignSelf: "flex-end",
    marginBottom: 24,
  },
  forgotPasswordText: {
    color: "#6C63FF",
    fontSize: 14,
  },
  loginButton: {
    backgroundColor: "#6C63FF",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  loginButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  footer: {
    alignItems: "center",
    marginBottom: 16,
  },
  footerText: {
    color: "#999",
    fontSize: 14,
    marginBottom: 4,
  },
  versionText: {
    color: "#999",
    fontSize: 12,
  },
});
