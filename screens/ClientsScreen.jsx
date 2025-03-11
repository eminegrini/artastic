import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  ActivityIndicator,
  ScrollView,
  Modal,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useTheme, getThemeColors } from "../context/ThemeContext";
import { useAppContext } from "../context/AppContext";

export default function ClientsScreen() {
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const { state, fetchClients, addClient, updateClient, deleteClient } =
    useAppContext();
  const { clients, orders, loading } = state;
  const [filteredClients, setFilteredClients] = useState([]);
  const { isDarkMode } = useTheme();
  const colors = getThemeColors(isDarkMode);

  // Estado para el formulario modal
  const [modalVisible, setModalVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentClient, setCurrentClient] = useState(null);

  // Estados para los campos del formulario
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [formErrors, setFormErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchClients();
  }, []);

  useEffect(() => {
    // Asegurarse de que clients es un array antes de filtrar
    if (!Array.isArray(clients)) {
      setFilteredClients([]);
      return;
    }

    if (searchQuery.trim() === "") {
      setFilteredClients(clients);
    } else {
      const filtered = clients.filter((client) => {
        // Verificar que client y sus propiedades existen
        if (!client) return false;

        const nameMatch =
          client.name &&
          client.name.toLowerCase().includes(searchQuery.toLowerCase());

        const emailMatch =
          client.email &&
          client.email.toLowerCase().includes(searchQuery.toLowerCase());

        const phoneMatch =
          client.phone &&
          client.phone.toLowerCase().includes(searchQuery.toLowerCase());

        return nameMatch || emailMatch || phoneMatch;
      });
      setFilteredClients(filtered);
    }
  }, [searchQuery, clients]);

  const toggleSearch = () => {
    setShowSearch(!showSearch);
    if (showSearch) {
      setSearchQuery("");
    }
  };

  // Función segura para obtener iniciales
  const getInitials = (name) => {
    if (!name) return "??";

    try {
      return name
        .split(" ")
        .filter((word) => word.length > 0)
        .map((word) => word[0])
        .join("")
        .toUpperCase()
        .substring(0, 2);
    } catch (error) {
      console.error("Error getting initials:", error);
      return "??";
    }
  };

  // Abrir modal para crear nuevo cliente
  const openAddModal = () => {
    setIsEditing(false);
    setCurrentClient(null);
    resetForm();
    setModalVisible(true);
  };

  // Abrir modal para editar cliente existente
  const openEditModal = (client) => {
    if (!client) return;

    setIsEditing(true);
    setCurrentClient(client);
    setName(client.name || "");
    setEmail(client.email || "");
    setPhone(client.phone || "");
    setAddress(client.address || "");
    setFormErrors({});
    setModalVisible(true);
  };

  // Resetear formulario
  const resetForm = () => {
    setName("");
    setEmail("");
    setPhone("");
    setAddress("");
    setFormErrors({});
  };

  // Validar el formulario
  const validateForm = () => {
    const errors = {};

    if (!name.trim()) {
      errors.name = "El nombre es obligatorio";
    }

    if (email && email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        errors.email = "Email inválido";
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Guardar cliente (crear o actualizar)
  const handleSaveClient = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      setIsSaving(true);

      const clientData = {
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        address: address.trim(),
      };

      if (isEditing && currentClient) {
        await updateClient(currentClient.id, clientData);
      } else {
        await addClient(clientData);
      }

      setModalVisible(false);
    } catch (error) {
      console.error("Error saving client:", error);
    } finally {
      setIsSaving(false);
    }
  };

  // Eliminar cliente
  const handleDeleteClient = (id) => {
    Alert.alert(
      "Eliminar cliente",
      "¿Estás seguro de que deseas eliminar este cliente? Esta acción no se puede deshacer.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteClient(id);
            } catch (error) {
              console.error("Error deleting client:", error);
            }
          },
        },
      ]
    );
  };

  const renderClientItem = ({ item }) => {
    if (!item) return null;

    // Contar los pedidos por cliente con verificación segura
    let totalOrders = 0;
    if (Array.isArray(orders)) {
      totalOrders = orders.filter(
        (order) => order && order.client_id === item.id
      ).length;
    }

    return (
      <TouchableOpacity
        style={[styles.clientCard, { backgroundColor: colors.card }]}
        onPress={() => openEditModal(item)}
      >
        <View
          style={[styles.avatarContainer, { backgroundColor: colors.primary }]}
        >
          <Text style={styles.avatarText}>{getInitials(item.name)}</Text>
        </View>
        <View style={styles.clientInfo}>
          <Text style={[styles.clientName, { color: colors.text }]}>
            {item.name || "Sin nombre"}
          </Text>
          <Text style={[styles.clientDetail, { color: colors.textSecondary }]}>
            {item.email || "Sin email"}
          </Text>
          <Text style={[styles.clientDetail, { color: colors.textSecondary }]}>
            {item.phone || "Sin teléfono"}
          </Text>
          <Text style={[styles.clientDetail, { color: colors.textSecondary }]}>
            {item.address || "Sin dirección"}
          </Text>
        </View>
        <View style={styles.clientActions}>
          <View style={styles.orderCounter}>
            <TouchableOpacity
              style={styles.moreButton}
              onPress={() => {
                Alert.alert("Opciones", "¿Que quieres hacer?", [
                  { text: "Cancelar", style: "cancel" },
                  {
                    text: "Editar",
                    onPress: () => openEditModal(item),
                  },
                  {
                    text: "Eliminar",
                    style: "destructive",
                    onPress: () => handleDeleteClient(item.id),
                  },
                ]);
              }}
            >
              <MaterialIcons
                name="more-vert"
                size={24}
                color={colors.textTertiary}
              />
            </TouchableOpacity>
            <Text style={[styles.orderCountText, { color: colors.primary }]}>
              {totalOrders}
            </Text>
            <Text style={[styles.orderLabel, { color: colors.textTertiary }]}>
              pedidos
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading && (!clients || clients.length === 0)) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            Clientes
          </Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Cargando clientes...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <View style={styles.header}>
        {!showSearch ? (
          <>
            <Text style={[styles.headerTitle, { color: colors.text }]}>
              Clientes
            </Text>
            <TouchableOpacity onPress={toggleSearch}>
              <Ionicons name="search" size={24} color={colors.text} />
            </TouchableOpacity>
          </>
        ) : (
          <View
            style={[styles.searchContainer, { backgroundColor: colors.card }]}
          >
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              placeholder="Buscar cliente..."
              placeholderTextColor={colors.textTertiary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus
            />
            <TouchableOpacity
              onPress={toggleSearch}
              style={styles.searchCloseButton}
            >
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>
        )}
      </View>

      <FlatList
        data={filteredClients}
        renderItem={renderClientItem}
        keyExtractor={(item) => item?.id || Math.random().toString()}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={() => (
          <View
            style={[styles.emptyContainer, { backgroundColor: colors.card }]}
          >
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              No hay clientes disponibles
            </Text>
            <TouchableOpacity
              style={[
                styles.addEmptyButton,
                { backgroundColor: colors.primary },
              ]}
              onPress={openAddModal}
            >
              <Text style={styles.addEmptyButtonText}>Añadir cliente</Text>
            </TouchableOpacity>
          </View>
        )}
      />

      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary }]}
        onPress={openAddModal}
      >
        <Ionicons name="add" size={24} color="white" />
      </TouchableOpacity>

      {/* Modal para añadir/editar cliente */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {isEditing ? "Editar Cliente" : "Añadir Cliente"}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.formContainer}>
              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>
                  Nombre *
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: colors.background,
                      color: colors.text,
                      borderColor: formErrors.name
                        ? colors.error
                        : colors.border,
                    },
                  ]}
                  placeholder="Nombre del cliente"
                  placeholderTextColor={colors.textTertiary}
                  value={name}
                  onChangeText={(text) => {
                    setName(text);
                    if (formErrors.name) {
                      setFormErrors({ ...formErrors, name: null });
                    }
                  }}
                />
                {formErrors.name ? (
                  <Text style={[styles.errorText, { color: colors.error }]}>
                    {formErrors.name}
                  </Text>
                ) : null}
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>
                  Email
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: colors.background,
                      color: colors.text,
                      borderColor: formErrors.email
                        ? colors.error
                        : colors.border,
                    },
                  ]}
                  placeholder="email@ejemplo.com"
                  placeholderTextColor={colors.textTertiary}
                  value={email}
                  onChangeText={(text) => {
                    setEmail(text);
                    if (formErrors.email) {
                      setFormErrors({ ...formErrors, email: null });
                    }
                  }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                {formErrors.email ? (
                  <Text style={[styles.errorText, { color: colors.error }]}>
                    {formErrors.email}
                  </Text>
                ) : null}
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>
                  Teléfono
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: colors.background,
                      color: colors.text,
                      borderColor: colors.border,
                    },
                  ]}
                  placeholder="Número de teléfono"
                  placeholderTextColor={colors.textTertiary}
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>
                  Dirección
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: colors.background,
                      color: colors.text,
                      borderColor: colors.border,
                      minHeight: 80,
                      textAlignVertical: "top",
                    },
                  ]}
                  placeholder="Dirección del cliente"
                  placeholderTextColor={colors.textTertiary}
                  value={address}
                  onChangeText={setAddress}
                  multiline={true}
                  numberOfLines={3}
                />
              </View>
            </ScrollView>

            <View style={styles.modalButtonContainer}>
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  styles.cancelButton,
                  { backgroundColor: isDarkMode ? "#2C2C2C" : "#F0F0F0" },
                ]}
                onPress={() => setModalVisible(false)}
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
                onPress={handleSaveClient}
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text style={styles.saveButtonText}>
                    {isEditing ? "Actualizar" : "Guardar"}
                  </Text>
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
    paddingBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
  },
  searchContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 8,
    marginLeft: 10,
  },
  searchInput: {
    flex: 1,
    height: 40,
    paddingHorizontal: 12,
    fontSize: 16,
  },
  searchCloseButton: {
    paddingHorizontal: 8,
  },
  listContainer: {
    paddingHorizontal: 24,
    paddingBottom: 80,
  },
  clientCard: {
    flexDirection: "row",
    borderRadius: 12,
    alignItems: "center",
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  avatarContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "white",
  },
  clientInfo: {
    flex: 1,
    justifyContent: "center",
  },
  clientName: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 4,
  },
  clientDetail: {
    fontSize: 14,
    marginBottom: 2,
  },
  clientActions: {
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  orderCounter: {
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  orderCountText: {
    fontSize: 18,
    fontWeight: "bold",
  },
  orderLabel: {
    fontSize: 12,
  },
  moreButton: {
    marginBottom: 8,
    padding: 4,
  },
  fab: {
    position: "absolute",
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
    borderRadius: 12,
    marginTop: 20,
  },
  emptyText: {
    fontSize: 16,
    marginBottom: 16,
    textAlign: "center",
  },
  addEmptyButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  addEmptyButtonText: {
    color: "white",
    fontWeight: "500",
  },

  // Estilos para el modal y formulario
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
    maxHeight: "80%",
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
  },
  formContainer: {
    maxHeight: 400,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    marginBottom: 8,
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
  },
  errorText: {
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
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
