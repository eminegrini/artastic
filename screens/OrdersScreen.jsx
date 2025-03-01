import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  ActivityIndicator,
  Modal,
  ScrollView,
  Alert,
  Image,
} from "react-native";
import { supabase } from "../services/supabaseClient";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, MaterialIcons, FontAwesome5 } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useTheme, getThemeColors } from "../context/ThemeContext";
import { useAppContext } from "../context/AppContext";
import { toast } from "sonner-native";
import DateTimePicker from "@react-native-community/datetimepicker";

export default function OrdersScreen() {
  const navigation = useNavigation();
  const { isDarkMode } = useTheme();
  const colors = getThemeColors(isDarkMode);
  const [filterStatus, setFilterStatus] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);

  const {
    state,
    fetchOrders,
    fetchClients,
    fetchPieces,
    addOrder,
    updateOrder,
    deleteOrder,
  } = useAppContext();
  const { orders, clients, pieces, loading } = state;
  const [filteredOrders, setFilteredOrders] = useState([]);

  // Estados para el modal
  const [modalVisible, setModalVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentOrder, setCurrentOrder] = useState(null);

  // Estados para el formulario
  const [selectedClient, setSelectedClient] = useState(null);
  const [orderItems, setOrderItems] = useState([]);
  const [orderStatus, setOrderStatus] = useState("pending");
  const [deliveryDate, setDeliveryDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [totalPrice, setTotalPrice] = useState(0);

  // Estados para selección de productos
  const [showProductModal, setShowProductModal] = useState(false);
  const [selectedPiece, setSelectedPiece] = useState(null);
  const [quantity, setQuantity] = useState("1");
  const [pricePerUnit, setPricePerUnit] = useState("");
  const [editingItemIndex, setEditingItemIndex] = useState(-1);

  // Estado para el selector de cliente
  const [showClientModal, setShowClientModal] = useState(false);
  const [clientSearchQuery, setClientSearchQuery] = useState("");
  const [filteredClients, setFilteredClients] = useState([]);

  // Cargar datos al inicio
  useEffect(() => {
    fetchOrders();
    fetchClients();
    fetchPieces();
  }, []); // Filtrar órdenes basadas en el estado seleccionado y la búsqueda
  useEffect(() => {
    if (!orders || !Array.isArray(orders) || orders.length === 0) {
      setFilteredOrders([]);
      return;
    }

    let result = [...orders]; // Clonar array para evitar problemas de referencia

    // Filtrar por estado
    if (filterStatus !== "all") {
      result = result.filter((order) => order && order.status === filterStatus);
    }

    // Filtrar por búsqueda
    if (searchQuery.trim() !== "") {
      result = result.filter((order) => {
        if (!order) return false;

        // Buscar por nombre de cliente
        const clientName =
          order.client && order.client.name
            ? order.client.name.toLowerCase()
            : "";

        // Buscar por productos
        const itemsMatch =
          order.items && Array.isArray(order.items)
            ? order.items.some((item) => {
                if (!item || !item.piece_id) return false;

                const piece =
                  pieces && Array.isArray(pieces)
                    ? pieces.find((p) => p && p.id === item.piece_id)
                    : null;

                return (
                  piece &&
                  piece.name &&
                  piece.name.toLowerCase().includes(searchQuery.toLowerCase())
                );
              })
            : false;

        return clientName.includes(searchQuery.toLowerCase()) || itemsMatch;
      });
    }

    setFilteredOrders(result);
  }, [filterStatus, searchQuery, orders, pieces]);

  // Filtrar clientes para el selector
  useEffect(() => {
    if (!clients || !Array.isArray(clients)) {
      setFilteredClients([]);
      return;
    }

    if (clientSearchQuery.trim() === "") {
      setFilteredClients(clients);
    } else {
      const filtered = clients.filter(
        (client) =>
          client &&
          client.name &&
          client.name.toLowerCase().includes(clientSearchQuery.toLowerCase())
      );
      setFilteredClients(filtered);
    }
  }, [clientSearchQuery, clients]);

  // Calcular precio total cuando cambian los items
  useEffect(() => {
    const total = orderItems.reduce((sum, item) => {
      return sum + Number(item.quantity) * Number(item.price_per_unit);
    }, 0);
    setTotalPrice(total);
  }, [orderItems]);

  const toggleSearch = () => {
    setShowSearch(!showSearch);
    if (showSearch) {
      setSearchQuery("");
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "Fecha no especificada";
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "Fecha inválida";
      return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
    } catch (error) {
      console.warn("Error formatting date:", error);
      return "Fecha inválida";
    }
  }; // Estados para búsqueda de productos
  const [productSearchQuery, setProductSearchQuery] = useState("");
  const [filteredPieces, setFilteredPieces] = useState([]);

  // Filtrar productos para el selector
  useEffect(() => {
    if (!pieces || !Array.isArray(pieces)) {
      setFilteredPieces([]);
      return;
    }

    if (productSearchQuery.trim() === "") {
      setFilteredPieces(pieces);
    } else {
      const filtered = pieces.filter(
        (piece) =>
          piece &&
          piece.name &&
          piece.name.toLowerCase().includes(productSearchQuery.toLowerCase())
      );
      setFilteredPieces(filtered);
    }
  }, [productSearchQuery, pieces]);

  // Funciones para el modal de creación/edición
  const openAddModal = () => {
    setIsEditing(false);
    setCurrentOrder(null);
    resetForm();
    setModalVisible(true);
  };

  const openEditModal = (order) => {
    if (!order) return;
    setIsEditing(true);
    setCurrentOrder(order);
    // Cargar datos del pedido
    setSelectedClient(order.clients || null);
    setOrderStatus(order.status || "pending");

    // Configurar fecha de entrega
    if (order.delivery_date) {
      try {
        const date = new Date(order.delivery_date);
        if (!isNaN(date.getTime())) {
          setDeliveryDate(date);
        } else {
          setDeliveryDate(new Date());
        }
      } catch (e) {
        setDeliveryDate(new Date());
      }
    } else {
      setDeliveryDate(new Date());
    }

    // Cargar items del pedido
    if (order.items && Array.isArray(order.items)) {
      const items = order.items.map((item) => {
        const piece = pieces.find((p) => p && p.id === item.piece_id);
        return {
          piece_id: item.piece_id,
          piece: piece || null,
          quantity: item.quantity,
          price_per_unit: item.price_per_unit,
        };
      });
      setOrderItems(items);
    } else {
      setOrderItems([]);
    }

    setModalVisible(true);
  };

  const resetForm = () => {
    setSelectedClient(null);
    setOrderItems([]);
    setOrderStatus("pending");
    setDeliveryDate(new Date());
    setTotalPrice(0);
  };

  // Funciones para gestionar items
  const openAddItemModal = () => {
    setSelectedPiece(null);
    setQuantity("1");
    setPricePerUnit("");
    setEditingItemIndex(-1);
    setShowProductModal(true);
  };

  const openEditItemModal = (index) => {
    const item = orderItems[index];
    if (!item) return;

    setSelectedPiece(item.piece);
    setQuantity(String(item.quantity));
    setPricePerUnit(String(item.price_per_unit));
    setEditingItemIndex(index);
    setShowProductModal(true);
  };
  const handleAddOrUpdateItem = () => {
    if (!selectedPiece) {
      toast.error("Debes seleccionar un producto");
      return;
    }

    const qty = Number(quantity);
    if (isNaN(qty) || qty <= 0) {
      toast.error("La cantidad debe ser un número positivo");
      return;
    }

    // Validar que la cantidad no supere el stock disponible
    if (selectedPiece.stock && qty > selectedPiece.stock) {
      toast.error(
        `Solo hay ${selectedPiece.stock} unidades disponibles de este producto`
      );
      return;
    }

    const price = Number(pricePerUnit);
    if (isNaN(price) || price <= 0) {
      toast.error("El precio debe ser un número positivo");
      return;
    }

    const newItem = {
      piece_id: selectedPiece.id,
      piece: selectedPiece,
      quantity: qty,
      price_per_unit: price || selectedPiece.retail_price,
    };

    if (editingItemIndex >= 0) {
      // Actualizar item existente
      const updatedItems = [...orderItems];
      updatedItems[editingItemIndex] = newItem;
      setOrderItems(updatedItems);
    } else {
      // Siempre añadir como nuevo item, incluso si ya existe uno igual
      // Esto permite que productos idénticos se muestren como elementos separados
      setOrderItems([...orderItems, newItem]);
    }

    setShowProductModal(false);
  };

  const removeItem = (index) => {
    const updatedItems = [...orderItems];
    updatedItems.splice(index, 1);
    setOrderItems(updatedItems);
  };

  // Funciones para selector de clientes
  const openClientSelector = () => {
    setClientSearchQuery("");
    setShowClientModal(true);
  };

  const selectClient = (client) => {
    setSelectedClient(client);
    setShowClientModal(false);
  };

  // Función para el datepicker
  const onDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setDeliveryDate(selectedDate);
    }
  };

  // Validar y guardar pedido
  const handleSaveOrder = async () => {
    // Validaciones
    if (!selectedClient) {
      toast.error("Debes seleccionar un cliente");
      return;
    }

    if (orderItems.length === 0) {
      toast.error("Debes añadir al menos un producto");
      return;
    }

    try {
      const orderData = {
        client_name: selectedClient.name,
        client_id: selectedClient.id,
        status: orderStatus,
        delivery_date: deliveryDate.toISOString(),
        total_price: totalPrice,
      };
      const itemsData = orderItems.map((item) => ({
        piece_id: item.piece_id,
        quantity: item.quantity,
        price_per_unit: item.price_per_unit,
      }));

      if (isEditing && currentOrder) {
        await updateOrder(currentOrder.id, orderData);
        toast.success("Pedido actualizado correctamente");
      } else {
        await addOrder(orderData, itemsData);
        toast.success("Pedido creado correctamente");
      }

      setModalVisible(false);
      resetForm();
      fetchOrders();
    } catch (error) {
      console.error("Error saving order:", error);
      toast.error("Error al guardar el pedido");
    }
  };

  // Función para eliminar pedido
  const handleDeleteOrder = (id) => {
    Alert.alert(
      "Eliminar pedido",
      "¿Estás seguro de que deseas eliminar este pedido? Esta acción no se puede deshacer.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteOrder(id);
              toast.success("Pedido eliminado correctamente");
            } catch (error) {
              console.error("Error deleting order:", error);
              toast.error("Error al eliminar el pedido");
            }
          },
        },
      ]
    );
  };

  const handleToggleOrderStatus = async (order) => {
    if (!order || !order.id) return;

    const newStatus = order.status === "pending" ? "delivered" : "pending";

    try {
      await updateOrder(order.id, { status: newStatus });
      toast.success(
        `Pedido marcado como ${
          newStatus === "delivered" ? "entregado" : "pendiente"
        }`
      );
    } catch (error) {
      console.error("Error updating order status:", error);
      toast.error("Error al actualizar el estado del pedido");
    }
  };
  const renderOrderItem = ({ item }) => {
    if (!item) return null;
    const clientName = item.client_name
      ? item.client_name
      : "Cliente desconocido";

    return (
      <TouchableOpacity
        style={[styles.orderCard, { backgroundColor: colors.card }]}
        onPress={() => openEditModal(item)}
      >
        <View style={styles.orderHeader}>
          <Text style={[styles.clientName, { color: colors.text }]}>
            {clientName}
          </Text>
          <TouchableOpacity onPress={() => handleToggleOrderStatus(item)}>
            <View
              style={[
                styles.statusBadge,
                item.status === "delivered"
                  ? { backgroundColor: isDarkMode ? "#1A3A2A" : "#E6F7ED" }
                  : { backgroundColor: isDarkMode ? "#3A2A0A" : "#FFF4E5" },
              ]}
            >
              <Text
                style={[
                  styles.statusText,
                  {
                    color:
                      item.status === "delivered"
                        ? isDarkMode
                          ? "#66BB6A"
                          : "#1B5E20"
                        : isDarkMode
                        ? "#FFA726"
                        : "#E65100",
                  },
                ]}
              >
                {item.status === "delivered" ? "Entregado" : "Pendiente"}
              </Text>
            </View>
          </TouchableOpacity>
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => openEditModal(item)}
            >
              <MaterialIcons name="edit" size={20} color={colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleDeleteOrder(item.id)}
            >
              <MaterialIcons name="delete" size={20} color={colors.error} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={[styles.orderDetails, { borderColor: colors.border }]}>
          {item.items && Array.isArray(item.items) && item.items.length > 0 ? (
            item.items.map((orderItem, index) => {
              if (!orderItem) return null;

              const piece =
                pieces && Array.isArray(pieces)
                  ? pieces.find((p) => p && p.id === orderItem.piece_id)
                  : null;

              return (
                <View style={styles.productRow} key={index}>
                  <Text
                    style={[
                      styles.productText,
                      { color: colors.textSecondary },
                    ]}
                  >
                    {piece
                      ? `${piece.name} x ${orderItem.quantity}`
                      : "Producto desconocido"}
                  </Text>
                  <Text
                    style={[
                      styles.productText,
                      { color: colors.textSecondary },
                    ]}
                  >
                    {piece
                      ? `$${orderItem.price_per_unit.toFixed(2)}`
                      : "Precio desconocido"}
                  </Text>
                </View>
              );
            })
          ) : (
            <Text style={[styles.productText, { color: colors.textSecondary }]}>
              No hay productos en este pedido
            </Text>
          )}
        </View>

        <View style={styles.orderFooter}>
          <View>
            <Text style={[styles.dateLabel, { color: colors.textTertiary }]}>
              Entrega:
            </Text>
            <Text style={[styles.dateText, { color: colors.textSecondary }]}>
              {formatDate(item.delivery_date)}
            </Text>
          </View>

          <View style={styles.priceContainer}>
            <Text style={[styles.priceLabel, { color: colors.textTertiary }]}>
              Total:
            </Text>
            <Text style={[styles.priceText, { color: colors.text }]}>
              $
              {item.total_price
                ? typeof item.total_price === "number"
                  ? item.total_price.toFixed(2)
                  : parseFloat(item.total_price).toFixed(2)
                : "0.00"}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };
  const renderClientItem = ({ item }) => {
    if (!item) return null;

    return (
      <TouchableOpacity
        style={[styles.clientItem, { borderBottomColor: colors.border }]}
        onPress={() => selectClient(item)}
      >
        <View
          style={[styles.clientAvatar, { backgroundColor: colors.primary }]}
        >
          <Text style={styles.clientAvatarText}>
            {item.name ? item.name.substring(0, 2).toUpperCase() : "??"}
          </Text>
        </View>
        <View style={styles.clientItemContent}>
          <Text style={[styles.clientItemName, { color: colors.text }]}>
            {item.name}
          </Text>
          <Text
            style={[styles.clientItemDetail, { color: colors.textSecondary }]}
          >
            {item.email || item.phone || "Sin contacto"}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };
  const renderPieceItem = ({ item }) => {
    if (!item) return null;

    return (
      <TouchableOpacity
        style={[styles.pieceItem, { borderBottomColor: colors.border }]}
        onPress={() => {
          setSelectedPiece(item);
          setPricePerUnit(String(item.retail_price || 0));
          // Inicializar la cantidad en 1 (o al stock disponible si es menor que 1)
          setQuantity(String(Math.min(1, item.stock || 1)));
        }}
      >
        <Image
          source={{
            uri:
              item.image_url ||
              `https://api.a0.dev/assets/image?text=3D printed ${encodeURIComponent(
                item.name
              )}&aspect=1:1`,
          }}
          style={styles.pieceImage}
        />
        <View style={styles.pieceItemContent}>
          <Text style={[styles.pieceItemName, { color: colors.text }]}>
            {item.name}
          </Text>
          <Text
            style={[
              styles.pieceItemDetail,
              {
                color: item.stock > 0 ? colors.textSecondary : colors.error,
              },
            ]}
          >
            Stock: {item.stock || 0} | Precio: $
            {item.retail_price?.toFixed(2) || "0.00"}
          </Text>
        </View>
        <View
          style={[
            styles.pieceSelectedIndicator,
            {
              backgroundColor:
                selectedPiece && selectedPiece.id === item.id
                  ? colors.primary
                  : "transparent",
            },
          ]}
        >
          {selectedPiece && selectedPiece.id === item.id && (
            <Ionicons name="checkmark" size={18} color="white" />
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <View style={styles.header}>
        {!showSearch ? (
          <>
            <Text style={[styles.headerTitle, { color: colors.text }]}>
              Pedidos
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
              placeholder="Buscar pedido..."
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
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[
            styles.filterChip,
            {
              backgroundColor:
                filterStatus === "all" ? colors.primary : colors.border,
            },
          ]}
          onPress={() => setFilterStatus("all")}
        >
          <Text
            style={[
              styles.filterText,
              {
                color: filterStatus === "all" ? "white" : colors.textSecondary,
              },
            ]}
          >
            Todos
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.filterChip,
            {
              backgroundColor:
                filterStatus === "pending" ? colors.primary : colors.border,
            },
          ]}
          onPress={() => setFilterStatus("pending")}
        >
          <Text
            style={[
              styles.filterText,
              {
                color:
                  filterStatus === "pending" ? "white" : colors.textSecondary,
              },
            ]}
          >
            Pendientes
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.filterChip,
            {
              backgroundColor:
                filterStatus === "delivered" ? colors.primary : colors.border,
            },
          ]}
          onPress={() => setFilterStatus("delivered")}
        >
          <Text
            style={[
              styles.filterText,
              {
                color:
                  filterStatus === "delivered" ? "white" : colors.textSecondary,
              },
            ]}
          >
            Entregados
          </Text>
        </TouchableOpacity>
      </View>
      {loading && (!filteredOrders || filteredOrders.length === 0) ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Cargando pedidos...
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredOrders}
          renderItem={renderOrderItem}
          keyExtractor={(item) => (item ? item.id : Math.random().toString())}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={() => (
            <View
              style={[styles.emptyContainer, { backgroundColor: colors.card }]}
            >
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                No hay pedidos disponibles
              </Text>
              <TouchableOpacity
                style={[
                  styles.addEmptyButton,
                  { backgroundColor: colors.primary },
                ]}
                onPress={openAddModal}
              >
                <Text style={styles.addEmptyButtonText}>Crear pedido</Text>
              </TouchableOpacity>
            </View>
          )}
        />
      )}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary }]}
        onPress={openAddModal}
      >
        <Ionicons name="add" size={24} color="white" />
      </TouchableOpacity>
      {/* Modal para crear/editar pedido */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View
            style={[
              styles.modalContent,
              { backgroundColor: colors.card, maxHeight: "80%" },
            ]}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {isEditing ? "Editar Pedido" : "Nuevo Pedido"}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView>
              {/* Cliente */}
              <View style={styles.formGroup}>
                <Text
                  style={[styles.formLabel, { color: colors.textSecondary }]}
                >
                  Cliente *
                </Text>
                {selectedClient ? (
                  <View
                    style={[
                      styles.selectedClientContainer,
                      { backgroundColor: colors.background },
                    ]}
                  >
                    <Text
                      style={[
                        styles.selectedClientName,
                        { color: colors.text },
                      ]}
                    >
                      {selectedClient.name}
                    </Text>
                    <TouchableOpacity onPress={openClientSelector}>
                      <Text
                        style={[
                          styles.changeClientButton,
                          { color: colors.primary },
                        ]}
                      >
                        Cambiar
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={[
                      styles.selectClientButton,
                      { backgroundColor: colors.background },
                    ]}
                    onPress={openClientSelector}
                  >
                    <Text
                      style={[
                        styles.selectClientText,
                        { color: colors.primary },
                      ]}
                    >
                      Seleccionar Cliente
                    </Text>
                    <Ionicons
                      name="chevron-forward"
                      size={20}
                      color={colors.primary}
                    />
                  </TouchableOpacity>
                )}
              </View>

              {/* Fecha de entrega */}
              <View style={styles.formGroup}>
                <Text
                  style={[styles.formLabel, { color: colors.textSecondary }]}
                >
                  Fecha de Entrega
                </Text>
                <TouchableOpacity
                  style={[
                    styles.dateButton,
                    { backgroundColor: colors.background },
                  ]}
                  onPress={() => setShowDatePicker(true)}
                >
                  <Text style={[styles.dateButtonText, { color: colors.text }]}>
                    {formatDate(deliveryDate.toISOString())}
                  </Text>
                  <Ionicons name="calendar" size={20} color={colors.primary} />
                </TouchableOpacity>

                {showDatePicker && (
                  <DateTimePicker
                    value={deliveryDate}
                    mode="date"
                    display="default"
                    onChange={onDateChange}
                    minimumDate={new Date()}
                  />
                )}
              </View>

              {/* Estado */}
              <View style={styles.formGroup}>
                <Text
                  style={[styles.formLabel, { color: colors.textSecondary }]}
                >
                  Estado
                </Text>
                <View style={styles.statusButtonsContainer}>
                  <TouchableOpacity
                    style={[
                      styles.statusOptionButton,
                      {
                        backgroundColor:
                          orderStatus === "pending"
                            ? isDarkMode
                              ? "#3A2A0A"
                              : "#FFF4E5"
                            : colors.background,
                      },
                    ]}
                    onPress={() => setOrderStatus("pending")}
                  >
                    <FontAwesome5
                      name="clock"
                      size={16}
                      color={
                        orderStatus === "pending"
                          ? "#FF9800"
                          : colors.textTertiary
                      }
                    />
                    <Text
                      style={[
                        styles.statusOptionText,
                        {
                          color:
                            orderStatus === "pending"
                              ? isDarkMode
                                ? "#FFA726"
                                : "#E65100"
                              : colors.textSecondary,
                        },
                      ]}
                    >
                      Pendiente
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.statusOptionButton,
                      {
                        backgroundColor:
                          orderStatus === "delivered"
                            ? isDarkMode
                              ? "#1A3A2A"
                              : "#E6F7ED"
                            : colors.background,
                      },
                    ]}
                    onPress={() => setOrderStatus("delivered")}
                  >
                    <Ionicons
                      name="checkmark-circle"
                      size={18}
                      color={
                        orderStatus === "delivered"
                          ? "#4CAF50"
                          : colors.textTertiary
                      }
                    />
                    <Text
                      style={[
                        styles.statusOptionText,
                        {
                          color:
                            orderStatus === "delivered"
                              ? isDarkMode
                                ? "#66BB6A"
                                : "#1B5E20"
                              : colors.textSecondary,
                        },
                      ]}
                    >
                      Entregado
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Productos */}
              <View style={styles.formGroup}>
                <View style={styles.formGroupHeader}>
                  <Text
                    style={[styles.formLabel, { color: colors.textSecondary }]}
                  >
                    Productos *
                  </Text>
                  <TouchableOpacity
                    style={[
                      styles.addProductButton,
                      { backgroundColor: colors.primary },
                    ]}
                    onPress={openAddItemModal}
                  >
                    <Ionicons name="add" size={18} color="white" />
                    <Text style={styles.addProductButtonText}>Añadir</Text>
                  </TouchableOpacity>
                </View>

                {orderItems.length > 0 ? (
                  <View
                    style={[
                      styles.productsContainer,
                      { backgroundColor: colors.background },
                    ]}
                  >
                    {orderItems.map((item, index) => (
                      <View
                        key={index}
                        style={[
                          styles.productItem,
                          { borderBottomColor: colors.border },
                        ]}
                      >
                        <View style={styles.productItemContent}>
                          <Text
                            style={[
                              styles.productItemName,
                              { color: colors.text },
                            ]}
                          >
                            {item.piece
                              ? item.piece.name
                              : "Producto desconocido"}
                          </Text>
                          <Text
                            style={[
                              styles.productItemDetail,
                              { color: colors.textSecondary },
                            ]}
                          >
                            {item.quantity} × $
                            {Number(item.price_per_unit).toFixed(2)} = $
                            {(item.quantity * item.price_per_unit).toFixed(2)}
                          </Text>
                        </View>
                        <View style={styles.productItemActions}>
                          <TouchableOpacity
                            style={styles.productDeleteButton}
                            onPress={() => removeItem(index)}
                          >
                            <MaterialIcons
                              name="delete"
                              size={20}
                              color={colors.error}
                            />
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))}

                    <View style={styles.totalContainer}>
                      <Text
                        style={[
                          styles.totalLabel,
                          { color: colors.textSecondary },
                        ]}
                      >
                        Total:
                      </Text>
                      <Text
                        style={[styles.totalAmount, { color: colors.text }]}
                      >
                        ${totalPrice.toFixed(2)}
                      </Text>
                    </View>
                  </View>
                ) : (
                  <View
                    style={[
                      styles.emptyProductsContainer,
                      { backgroundColor: colors.background },
                    ]}
                  >
                    <Text
                      style={[
                        styles.emptyProductsText,
                        { color: colors.textTertiary },
                      ]}
                    >
                      No hay productos añadidos
                    </Text>
                  </View>
                )}
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
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
                style={[
                  styles.modalButton,
                  styles.saveButton,
                  { backgroundColor: colors.primary },
                ]}
                onPress={handleSaveOrder}
              >
                <Text style={styles.saveButtonText}>
                  {isEditing ? "Actualizar" : "Guardar"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      {/* Modal para seleccionar cliente */}
      <Modal
        visible={showClientModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowClientModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                Seleccionar Cliente
              </Text>
              <TouchableOpacity onPress={() => setShowClientModal(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <View
              style={[
                styles.searchContainer,
                styles.clientSearchContainer,
                { backgroundColor: colors.background },
              ]}
            >
              <Ionicons name="search" size={20} color={colors.textTertiary} />
              <TextInput
                style={[styles.searchInput, { color: colors.text }]}
                placeholder="Buscar cliente..."
                placeholderTextColor={colors.textTertiary}
                value={clientSearchQuery}
                onChangeText={setClientSearchQuery}
              />
            </View>

            <FlatList
              data={filteredClients}
              renderItem={renderClientItem}
              keyExtractor={(item) => item?.id || Math.random().toString()}
              contentContainerStyle={styles.modalListContainer}
              ListEmptyComponent={() => (
                <View style={styles.emptyListContainer}>
                  <Text
                    style={[
                      styles.emptyListText,
                      { color: colors.textSecondary },
                    ]}
                  >
                    No se encontraron clientes
                  </Text>
                </View>
              )}
            />
          </View>
        </View>
      </Modal>
      {/* Modal para añadir/editar producto */}
      <Modal
        visible={showProductModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowProductModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {editingItemIndex >= 0 ? "Editar Producto" : "Añadir Producto"}
              </Text>
              <TouchableOpacity onPress={() => setShowProductModal(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              {/* Selector de pieza */}
              <View style={styles.formGroup}>
                <View
                  style={[
                    styles.productSearchContainer,
                    { backgroundColor: colors.background },
                  ]}
                >
                  <Ionicons
                    name="search"
                    size={20}
                    color={colors.textTertiary}
                  />
                  <TextInput
                    style={[styles.searchInput, { color: colors.text }]}
                    placeholder="Buscar producto..."
                    placeholderTextColor={colors.textTertiary}
                    value={productSearchQuery}
                    onChangeText={setProductSearchQuery}
                  />
                  {productSearchQuery !== "" && (
                    <TouchableOpacity
                      onPress={() => setProductSearchQuery("")}
                      style={styles.searchClearButton}
                    >
                      <Ionicons
                        name="close-circle"
                        size={20}
                        color={colors.textTertiary}
                      />
                    </TouchableOpacity>
                  )}
                </View>

                <View
                  style={[
                    styles.productsListContainer,
                    { backgroundColor: colors.background },
                  ]}
                >
                  <FlatList
                    data={filteredPieces}
                    renderItem={renderPieceItem}
                    keyExtractor={(item) =>
                      item?.id || Math.random().toString()
                    }
                    style={styles.productsList}
                    ListEmptyComponent={() => (
                      <View style={styles.emptyListContainer}>
                        <Text
                          style={[
                            styles.emptyListText,
                            { color: colors.textSecondary },
                          ]}
                        >
                          {productSearchQuery
                            ? "No se encontraron productos con ese nombre"
                            : "No hay productos disponibles"}
                        </Text>
                      </View>
                    )}
                  />
                </View>
              </View>
              <View style={styles.quantityPriceContainer}>
                {/* Cantidad */}
                <View style={[styles.formGroup, styles.quantityInput]}>
                  <Text
                    style={[styles.formLabel, { color: colors.textSecondary }]}
                  >
                    Cantidad *
                    {selectedPiece && `(máx: ${selectedPiece.stock || 0})`}
                  </Text>
                  <TextInput
                    style={[
                      styles.textInput,
                      {
                        backgroundColor: colors.background,
                        color: colors.text,
                      },
                    ]}
                    keyboardType="numeric"
                    value={quantity}
                    onChangeText={(value) => {
                      // Validar que no sea mayor que el stock mientras se escribe
                      if (selectedPiece && selectedPiece.stock) {
                        const numValue = parseInt(value) || 0;
                        if (numValue > selectedPiece.stock) {
                          setQuantity(String(selectedPiece.stock));
                          return;
                        }
                      }
                      setQuantity(value);
                    }}
                    placeholder="1"
                    placeholderTextColor={colors.textTertiary}
                  />
                </View>

                {/* Precio unitario */}
                <View style={[styles.formGroup, styles.priceInput]}>
                  <Text
                    style={[styles.formLabel, { color: colors.textSecondary }]}
                  >
                    Precio Unitario *
                  </Text>
                  <TextInput
                    style={[
                      styles.textInput,
                      {
                        backgroundColor: colors.background,
                        color: colors.text,
                      },
                    ]}
                    keyboardType="decimal-pad"
                    value={pricePerUnit}
                    onChangeText={setPricePerUnit}
                    placeholder="0.00"
                    placeholderTextColor={colors.textTertiary}
                  />
                </View>
              </View>
              {/* Subtotal */}
              <View style={styles.subtotalContainer}>
                <Text
                  style={[
                    styles.subtotalLabel,
                    { color: colors.textSecondary },
                  ]}
                >
                  Subtotal:
                </Text>
                <Text style={[styles.subtotalAmount, { color: colors.text }]}>
                  $
                  {(Number(quantity || 0) * Number(pricePerUnit || 0)).toFixed(
                    2
                  )}
                </Text>
              </View>
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  styles.cancelButton,
                  { backgroundColor: isDarkMode ? "#2C2C2C" : "#F0F0F0" },
                ]}
                onPress={() => setShowProductModal(false)}
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
                style={[
                  styles.modalButton,
                  styles.saveButton,
                  { backgroundColor: colors.primary },
                ]}
                onPress={handleAddOrUpdateItem}
              >
                <Text style={styles.saveButtonText}>
                  {editingItemIndex >= 0 ? "Actualizar" : "Añadir"}
                </Text>
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
    borderBottomWidth: 0.5,
    paddingHorizontal: 12,
    fontSize: 16,
  },
  searchCloseButton: {
    paddingHorizontal: 8,
  },
  filterContainer: {
    flexDirection: "row",
    paddingHorizontal: 24,
    marginBottom: 20,
  },
  filterChip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginRight: 8,
    borderRadius: 20,
  },
  filterText: {
    fontSize: 14,
    fontWeight: "500",
  },
  productRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  productSearchContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  // Lista de pedidos
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
  listContainer: {
    paddingHorizontal: 24,
    paddingBottom: 80,
  },
  orderCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  orderHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  clientName: {
    fontSize: 16,
    fontWeight: "bold",
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "500",
  },
  orderDetails: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
    paddingVertical: 12,
    marginBottom: 12,
  },
  productText: {
    fontSize: 14,
    marginBottom: 4,
  },
  orderFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  dateLabel: {
    fontSize: 12,
    marginBottom: 2,
  },
  dateText: {
    fontSize: 14,
  },
  priceContainer: {
    alignItems: "flex-end",
  },
  priceLabel: {
    fontSize: 12,
    marginBottom: 2,
  },
  priceText: {
    fontSize: 18,
    fontWeight: "bold",
  },

  actionButtons: {
    flexDirection: "row",
  },
  actionButton: {
    padding: 8,
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

  // Estilos para modales
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    padding: 20,
  },
  modalContent: {
    width: "100%",
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
  },
  modalFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  cancelButton: {
    marginRight: 8,
  },
  saveButton: {
    marginLeft: 8,
  },
  cancelButtonText: {
    fontWeight: "600",
  },
  saveButtonText: {
    color: "white",
    fontWeight: "600",
  },

  // Estilos para formularios
  formGroup: {
    marginBottom: 16,
  },
  formGroupHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  formLabel: {
    fontSize: 14,
    marginBottom: 8,
  },

  // Selección de cliente
  selectClientButton: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12,
    borderRadius: 8,
  },
  selectClientText: {
    fontSize: 16,
    fontWeight: "500",
  },
  selectedClientContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12,
    borderRadius: 8,
  },
  selectedClientName: {
    fontSize: 16,
    fontWeight: "500",
  },
  changeClientButton: {
    fontSize: 14,
    fontWeight: "500",
  },

  // Botón de fecha
  dateButton: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12,
    borderRadius: 8,
  },
  dateButtonText: {
    fontSize: 16,
  },

  // Selección de estado
  statusButtonsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  statusOptionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    flex: 1,
    marginHorizontal: 4,
  },
  statusOptionText: {
    marginLeft: 8,
    fontWeight: "500",
  },

  // Sección de productos
  addProductButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  addProductButtonText: {
    color: "white",
    fontWeight: "500",
    marginLeft: 4,
  },
  productsContainer: {
    borderRadius: 8,
    overflow: "hidden",
  },
  emptyProductsContainer: {
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  emptyProductsText: {
    fontSize: 14,
  },
  productItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 12,
    borderBottomWidth: 1,
  },
  productItemContent: {
    flex: 1,
  },
  productItemName: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 4,
  },
  productItemDetail: {
    fontSize: 14,
  },
  productItemActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  productEditButton: {
    padding: 4,
    marginRight: 8,
  },
  productDeleteButton: {
    padding: 4,
  },
  totalContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: "500",
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: "bold",
  },

  // Selector de cliente
  clientSearchContainer: {
    marginBottom: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  modalListContainer: {
    paddingBottom: 16,
  },
  clientItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderBottomWidth: 1,
  },
  clientAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  clientAvatarText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 16,
  },
  clientItemContent: {
    flex: 1,
  },
  clientItemName: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 4,
  },
  clientItemDetail: {
    fontSize: 14,
  },

  // Selector de productos
  productsListContainer: {
    height: 400,
    borderRadius: 8,
    overflow: "hidden",
    marginBottom: 16,
  },
  productsList: {
    flex: 1,
  },
  pieceItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderBottomWidth: 1,
  },
  pieceImage: {
    width: 50,
    height: 50,
    borderRadius: 6,
    marginRight: 12,
  },
  pieceItemContent: {
    flex: 1,
  },
  pieceItemName: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 4,
  },
  pieceItemDetail: {
    fontSize: 14,
  },
  pieceSelectedIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },

  // Cantidad y precio
  quantityPriceContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  quantityInput: {
    flex: 1,
    marginRight: 8,
  },
  priceInput: {
    flex: 1,
    marginLeft: 8,
  },
  textInput: {
    padding: 12,
    borderRadius: 8,
    fontSize: 16,
  },
  subtotalContainer: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    marginTop: 16,
    paddingHorizontal: 8,
  },
  subtotalLabel: {
    fontSize: 16,
    marginRight: 8,
  },
  subtotalAmount: {
    fontSize: 18,
    fontWeight: "bold",
  },

  // Estados vacíos
  emptyListContainer: {
    marginTop: 70,
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyListText: {
    fontSize: 14,
  },
});
