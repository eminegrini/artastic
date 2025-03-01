import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Switch,
  Alert,
  ScrollView,
  TextInput,
  Modal,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, MaterialIcons, FontAwesome } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { supabase } from "../services/supabaseClient";
import { toast } from "sonner-native";
import * as ImagePicker from "expo-image-picker";
import { useTheme, getThemeColors } from "../context/ThemeContext";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Función para generar URL de imágenes usando la API
const getApiImageUrl = (text) => {
  return `https://api.a0.dev/assets/image?text=${encodeURIComponent(
    text
  )}&aspect=1:1&seed=${Date.now()}`;
};

// Función para subir imágenes a Cloudinary
const uploadToCloudinary = async (base64Image) => {
  try {
    const CLOUDINARY_UPLOAD_URL =
      "https://api.cloudinary.com/v1_1/dpnmheei1/image/upload";
    const CLOUDINARY_UPLOAD_PRESET = "ml_default";

    // Eliminar el prefijo "data:image/jpeg;base64," si existe
    const base64Data = base64Image.includes("base64,")
      ? base64Image.split("base64,")[1]
      : base64Image;

    // Crear el objeto FormData para la solicitud
    const formData = new FormData();
    formData.append("file", `data:image/jpeg;base64,${base64Data}`);
    formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

    // Realizar la solicitud a Cloudinary
    const response = await fetch(CLOUDINARY_UPLOAD_URL, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error("Error uploading to Cloudinary");
    }

    const data = await response.json();
    return data.secure_url;
  } catch (error) {
    console.error("Error uploading image to Cloudinary:", error);
    throw error;
  }
};

export default function ProfileScreen() {
  const navigation = useNavigation();
  const [userProfile, setUserProfile] = useState({
    id: "",
    email: "",
    name: "Usuario",
    phone: "",
    avatar_url: "",
  });
  const [loading, setLoading] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const { isDarkMode, setDarkMode } = useTheme();
  const colors = getThemeColors(isDarkMode);

  // Modales y estados para edición
  const [showPersonalInfoModal, setShowPersonalInfoModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [editingName, setEditingName] = useState("");
  const [editingPhone, setEditingPhone] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [updatingProfile, setUpdatingProfile] = useState(false);

  useEffect(() => {
    fetchUserProfile();

    // Cargar preferencias guardadas
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      // Cargar la preferencia de notificaciones
      const notifEnabled = AsyncStorage.getItem("notificationsEnabled");
      if (notifEnabled !== null) {
        setNotificationsEnabled(notifEnabled === "true");
      }

      // Nota: no necesitamos cargar la preferencia de modo oscuro
      // ya que se maneja desde el contexto ThemeContext
    } catch (error) {
      console.error("Error loading preferences:", error);
    }
  };

  const savePreference = (key, value) => {
    try {
      AsyncStorage.setItem(key, String(value));
    } catch (error) {
      console.error(`Error saving ${key}:`, error);
    }
  };

  const handleNotificationsToggle = (value) => {
    setNotificationsEnabled(value);
    savePreference("notificationsEnabled", value);
    toast.success(
      value ? "Notificaciones activadas" : "Notificaciones desactivadas"
    );
  };

  const handleDarkModeToggle = (value) => {
    setDarkMode(value);
    toast.success(value ? "Modo oscuro activado" : "Modo oscuro desactivado");
  };

  const fetchUserProfile = async () => {
    try {
      setLoading(true);

      // Get user from auth
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        // Get user profile from profiles table
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();

        if (data) {
          setUserProfile({
            id: user.id,
            email: user.email || "",
            name: data.name || "Usuario",
            phone: data.phone || "",
            avatar_url: data.avatar_url || "",
          });
          setEditingName(data.name || "");
          setEditingPhone(data.phone || "");
        } else {
          // Si no existe un perfil, creamos uno nuevo con datos por defecto
          const { data: newProfile, error: createError } = await supabase
            .from("profiles")
            .insert({
              id: user.id,
              name: "Usuario",
              avatar_url: "",
              updated_at: new Date(),
            })
            .select()
            .single();

          if (!createError && newProfile) {
            setUserProfile({
              id: user.id,
              email: user.email || "",
              name: newProfile.name || "Usuario",
              phone: newProfile.phone || "",
              avatar_url: newProfile.avatar_url || "",
            });
            setEditingName(newProfile.name || "");
            setEditingPhone(newProfile.phone || "");
          } else {
            setUserProfile({
              id: user.id,
              email: user.email || "",
              name: "Usuario",
              phone: "",
              avatar_url: "",
            });
          }
        }
      }
    } catch (error) {
      console.error("Error fetching user profile:", error);
      toast.error("No se pudo cargar el perfil");
    } finally {
      setLoading(false);
    }
  };

  const updatePersonalInfo = async () => {
    if (!editingName.trim()) {
      toast.error("El nombre no puede estar vacío");
      return;
    }

    try {
      setUpdatingProfile(true);

      const { error } = await supabase
        .from("profiles")
        .update({
          name: editingName,
          phone: editingPhone,
          updated_at: new Date(),
        })
        .eq("id", userProfile.id);

      if (error) throw error;

      setUserProfile({
        ...userProfile,
        name: editingName,
        phone: editingPhone,
      });

      toast.success("Información actualizada con éxito");
      setShowPersonalInfoModal(false);
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("Error al actualizar la información");
    } finally {
      setUpdatingProfile(false);
    }
  };

  const changePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error("Todos los campos son obligatorios");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("Las contraseñas nuevas no coinciden");
      return;
    }

    if (newPassword.length < 6) {
      toast.error("La contraseña debe tener al menos 6 caracteres");
      return;
    }

    try {
      setUpdatingProfile(true);

      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      toast.success("Contraseña actualizada con éxito");
      setShowPasswordModal(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      console.error("Error updating password:", error);
      toast.error("Error al actualizar la contraseña");
    } finally {
      setUpdatingProfile(false);
    }
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];

        // Actualiza avatar_url en la base de datos
        setUpdatingProfile(true);

        let avatarUrl = "";
        try {
          // Intentar subir a Cloudinary
          if (asset.base64) {
            avatarUrl = await uploadToCloudinary(
              `data:image/jpeg;base64,${asset.base64}`
            );
          }
        } catch (uploadError) {
          console.error("Error uploading to Cloudinary:", uploadError);
          // Si falla Cloudinary, usar la API de imágenes como respaldo
          avatarUrl = getApiImageUrl(`profile+${userProfile.name}`);
        }

        const { error } = await supabase
          .from("profiles")
          .update({
            avatar_url: avatarUrl,
            updated_at: new Date(),
          })
          .eq("id", userProfile.id);

        if (error) throw error;

        setUserProfile({
          ...userProfile,
          avatar_url: avatarUrl,
        });

        toast.success("Foto de perfil actualizada");
        setUpdatingProfile(false);
      }
    } catch (error) {
      console.error("Error updating profile picture:", error);
      toast.error("Error al actualizar la foto de perfil");
      setUpdatingProfile(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert("Cerrar sesión", "¿Estás seguro de que deseas cerrar sesión?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Cerrar sesión",
        style: "destructive",
        onPress: async () => {
          try {
            await supabase.auth.signOut();
            toast.success("Has cerrado sesión correctamente");
          } catch (error) {
            console.error("Error signing out:", error);
            toast.error("Error al cerrar sesión");
          }
        },
      },
    ]);
  };

  // Función para obtener las iniciales del nombre
  const getInitials = (name) => {
    return name
      .split(" ")
      .map((word) => word[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color="#6C63FF" />
        <Text style={styles.loadingText}>Cargando perfil...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.navigate("Root")}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          Mi Perfil
        </Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.profileSection, { backgroundColor: colors.card }]}>
          <View style={styles.avatarContainer}>
            {userProfile.avatar_url ? (
              <Image
                source={{ uri: userProfile.avatar_url }}
                style={styles.avatar}
              />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarInitials}>
                  {getInitials(userProfile.name)}
                </Text>
              </View>
            )}
            <TouchableOpacity
              style={styles.editAvatarButton}
              onPress={pickImage}
            >
              <Ionicons name="camera" size={20} color="white" />
            </TouchableOpacity>
          </View>

          <Text style={[styles.userName, { color: colors.text }]}>
            {userProfile.name}
          </Text>
          <Text style={[styles.userEmail, { color: colors.textSecondary }]}>
            {userProfile.email}
          </Text>
        </View>

        <View
          style={[styles.sectionContainer, { backgroundColor: colors.card }]}
        >
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Cuenta
          </Text>

          <TouchableOpacity
            style={styles.optionItem}
            onPress={() => setShowPersonalInfoModal(true)}
          >
            <View style={styles.optionIconContainer}>
              <Ionicons name="person" size={22} color="#6C63FF" />
            </View>
            <View style={styles.optionTextContainer}>
              <Text style={[styles.optionTitle, { color: colors.text }]}>
                Información personal
              </Text>
              <Text
                style={[
                  styles.optionDescription,
                  { color: colors.textSecondary },
                ]}
              >
                Nombre, teléfono
              </Text>
            </View>
            <MaterialIcons
              name="chevron-right"
              size={24}
              color={colors.textTertiary}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.optionItem}
            onPress={() => setShowPasswordModal(true)}
          >
            <View style={styles.optionIconContainer}>
              <Ionicons name="lock-closed" size={22} color="#6C63FF" />
            </View>
            <View style={styles.optionTextContainer}>
              <Text style={[styles.optionTitle, { color: colors.text }]}>
                Seguridad
              </Text>
              <Text
                style={[
                  styles.optionDescription,
                  { color: colors.textSecondary },
                ]}
              >
                Cambia tu contraseña
              </Text>
            </View>
            <MaterialIcons
              name="chevron-right"
              size={24}
              color={colors.textTertiary}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.optionItem, { borderBottomWidth: 0 }]}
          >
            <View style={styles.optionIconContainer}>
              <FontAwesome name="bell" size={22} color="#6C63FF" />
            </View>
            <View style={styles.optionTextContainer}>
              <Text style={[styles.optionTitle, { color: colors.text }]}>
                Notificaciones
              </Text>
              <Text
                style={[
                  styles.optionDescription,
                  { color: colors.textSecondary },
                ]}
              >
                Configurar alertas
              </Text>
            </View>
            <MaterialIcons
              name="chevron-right"
              size={24}
              color={colors.textTertiary}
            />
          </TouchableOpacity>
        </View>

        <View
          style={[styles.sectionContainer, { backgroundColor: colors.card }]}
        >
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Configuración
          </Text>

          <View style={styles.optionItem}>
            <View style={styles.optionIconContainer}>
              <Ionicons name="notifications" size={22} color="#6C63FF" />
            </View>
            <View style={styles.optionTextContainer}>
              <Text style={[styles.optionTitle, { color: colors.text }]}>
                Notificaciones push
              </Text>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={handleNotificationsToggle}
              trackColor={{ false: colors.border, true: colors.primary + "80" }}
              thumbColor={
                notificationsEnabled
                  ? colors.primary
                  : isDarkMode
                  ? "#555"
                  : "#F5F5F5"
              }
              ios_backgroundColor={colors.border}
            />
          </View>

          <View style={[styles.optionItem, { borderBottomWidth: 0 }]}>
            <View style={styles.optionIconContainer}>
              <Ionicons name="moon" size={22} color="#6C63FF" />
            </View>
            <View style={styles.optionTextContainer}>
              <Text style={[styles.optionTitle, { color: colors.text }]}>
                Modo oscuro
              </Text>
            </View>
            <Switch
              value={isDarkMode}
              onValueChange={handleDarkModeToggle}
              trackColor={{ false: colors.border, true: colors.primary + "80" }}
              thumbColor={
                isDarkMode ? colors.primary : isDarkMode ? "#555" : "#F5F5F5"
              }
              ios_backgroundColor={colors.border}
            />
          </View>
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out" size={22} color="white" />
          <Text style={styles.logoutText}>Cerrar sesión</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Modal para editar información personal */}
      <Modal
        visible={showPersonalInfoModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowPersonalInfoModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                Información personal
              </Text>
              <TouchableOpacity onPress={() => setShowPersonalInfoModal(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalFormGroup}>
              <Text
                style={[styles.modalLabel, { color: colors.textSecondary }]}
              >
                Nombre
              </Text>
              <TextInput
                style={[
                  styles.modalInput,
                  {
                    backgroundColor: colors.background,
                    color: colors.text,
                    borderColor: colors.border,
                  },
                ]}
                value={editingName}
                onChangeText={setEditingName}
                placeholder="Tu nombre"
                placeholderTextColor={colors.textTertiary}
              />
            </View>

            <View style={styles.modalFormGroup}>
              <Text
                style={[styles.modalLabel, { color: colors.textSecondary }]}
              >
                Teléfono
              </Text>
              <TextInput
                style={[
                  styles.modalInput,
                  {
                    backgroundColor: colors.background,
                    color: colors.text,
                    borderColor: colors.border,
                  },
                ]}
                value={editingPhone}
                onChangeText={setEditingPhone}
                placeholder="Tu número de teléfono"
                placeholderTextColor={colors.textTertiary}
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.modalButtonContainer}>
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  styles.cancelButton,
                  { backgroundColor: isDarkMode ? "#2C2C2C" : "#F0F0F0" },
                ]}
                onPress={() => setShowPersonalInfoModal(false)}
              >
                <Text
                  style={[
                    styles.cancelButtonText,
                    { color: colors.textSecondary },
                  ]}
                >
                  Cancelar
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={updatePersonalInfo}
                disabled={updatingProfile}
              >
                {updatingProfile ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text style={styles.saveButtonText}>Guardar</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal para cambiar contraseña */}
      <Modal
        visible={showPasswordModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowPasswordModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                Cambiar contraseña
              </Text>
              <TouchableOpacity onPress={() => setShowPasswordModal(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalFormGroup}>
              <Text
                style={[styles.modalLabel, { color: colors.textSecondary }]}
              >
                Contraseña actual
              </Text>
              <TextInput
                style={[
                  styles.modalInput,
                  {
                    backgroundColor: colors.background,
                    color: colors.text,
                    borderColor: colors.border,
                  },
                ]}
                value={currentPassword}
                onChangeText={setCurrentPassword}
                placeholder="Tu contraseña actual"
                placeholderTextColor={colors.textTertiary}
                secureTextEntry
              />
            </View>

            <View style={styles.modalFormGroup}>
              <Text
                style={[styles.modalLabel, { color: colors.textSecondary }]}
              >
                Nueva contraseña
              </Text>
              <TextInput
                style={[
                  styles.modalInput,
                  {
                    backgroundColor: colors.background,
                    color: colors.text,
                    borderColor: colors.border,
                  },
                ]}
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="Nueva contraseña"
                placeholderTextColor={colors.textTertiary}
                secureTextEntry
              />
            </View>

            <View style={styles.modalFormGroup}>
              <Text
                style={[styles.modalLabel, { color: colors.textSecondary }]}
              >
                Confirmar nueva contraseña
              </Text>
              <TextInput
                style={[
                  styles.modalInput,
                  {
                    backgroundColor: colors.background,
                    color: colors.text,
                    borderColor: colors.border,
                  },
                ]}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Confirma nueva contraseña"
                placeholderTextColor={colors.textTertiary}
                secureTextEntry
              />
            </View>

            <View style={styles.modalButtonContainer}>
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  styles.cancelButton,
                  { backgroundColor: isDarkMode ? "#2C2C2C" : "#F0F0F0" },
                ]}
                onPress={() => setShowPasswordModal(false)}
              >
                <Text
                  style={[
                    styles.cancelButtonText,
                    { color: colors.textSecondary },
                  ]}
                >
                  Cancelar
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={changePassword}
                disabled={updatingProfile}
              >
                {updatingProfile ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text style={styles.saveButtonText}>Actualizar</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7F8FC",
  },
  loadingContainer: {
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#666",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
  },
  placeholder: {
    width: 32,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  profileSection: {
    alignItems: "center",
    marginBottom: 24,
    padding: 24,
    borderRadius: 12,
  },
  avatarContainer: {
    position: "relative",
    marginBottom: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#F0F0F0",
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#6C63FF",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarInitials: {
    fontSize: 36,
    fontWeight: "bold",
    color: "white",
  },
  editAvatarButton: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: "#6C63FF",
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "white",
  },
  userName: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 16,
    color: "#666",
  },
  sectionContainer: {
    borderRadius: 12,
    marginBottom: 24,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 16,
  },
  optionItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  optionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F5F5FF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  optionTextContainer: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    color: "#333",
    fontWeight: "500",
  },
  optionDescription: {
    fontSize: 14,
    color: "#999",
    marginTop: 2,
  },
  logoutButton: {
    flexDirection: "row",
    backgroundColor: "#FF5252",
    borderRadius: 12,
    padding: 16,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 40,
  },
  logoutText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 16,
    marginLeft: 8,
  },

  // Estilos para los modales
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    padding: 20,
  },
  modalContent: {
    width: "100%",
    backgroundColor: "white",
    borderRadius: 12,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  modalFormGroup: {
    marginBottom: 16,
  },
  modalLabel: {
    fontSize: 14,
    color: "#666",
    marginBottom: 6,
  },
  modalInput: {
    backgroundColor: "#F7F8FC",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    fontSize: 16,
    borderWidth: 1,
  },
  modalButtonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: "#F0F0F0",
    marginRight: 8,
  },
  saveButton: {
    backgroundColor: "#6C63FF",
    marginLeft: 8,
  },
  cancelButtonText: {
    color: "#666",
    fontWeight: "600",
  },
  saveButtonText: {
    color: "white",
    fontWeight: "600",
  },
});
