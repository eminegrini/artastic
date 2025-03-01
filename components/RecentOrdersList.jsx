import React from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useAppContext } from "../context/AppContext";
import { useNavigation } from "@react-navigation/native";
import { useTheme, getThemeColors } from "../context/ThemeContext";

export const RecentOrdersList = () => {
  const { state } = useAppContext();
  const { orders, pieces, loading } = state;
  const navigation = useNavigation();
  const { isDarkMode } = useTheme();
  const colors = getThemeColors(isDarkMode);

  // Obtener los pedidos más recientes
  const recentOrders = [...orders]
    .sort((a, b) => {
      return (
        new Date(b.created_at || "").getTime() -
        new Date(a.created_at || "").getTime()
      );
    })
    .slice(0, 4);
  if (loading && orders.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
          Cargando pedidos...
        </Text>
      </View>
    );
  }
  if (orders.length === 0) {
    return (
      <View
        style={[styles.emptyContainer, { backgroundColor: colors.background }]}
      >
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
          No hay pedidos recientes
        </Text>
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: colors.primary }]}
          onPress={() => navigation.navigate("Orders")}
        >
          <Text style={styles.addButtonText}>Añadir pedido</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const day = date.getDate();
    const month = [
      "ene",
      "feb",
      "mar",
      "abr",
      "may",
      "jun",
      "jul",
      "ago",
      "sep",
      "oct",
      "nov",
      "dic",
    ][date.getMonth()];
    return `${day} ${month}`;
  };
  const renderOrderItem = ({ item }) => (
    <TouchableOpacity
      style={[styles.orderItem, { borderBottomColor: colors.border }]}
    >
      <View style={styles.orderLeftContent}>
        <Text style={[styles.clientName, { color: colors.text }]}>
          {item.client ? item.client.name : "Cliente desconocido"}
        </Text>
        <Text style={[styles.orderDetail, { color: colors.textSecondary }]}>
          {item.items && item.items.length > 0
            ? `${item.items.length} ${
                item.items.length === 1 ? "artículo" : "artículos"
              }`
            : "Sin artículos"}
        </Text>
        <Text style={[styles.orderDate, { color: colors.textTertiary }]}>
          {formatDate(item.created_at)}
        </Text>
      </View>
      <View style={styles.orderRightContent}>
        <Text style={[styles.orderTotal, { color: colors.text }]}>
          ${item.total_price?.toFixed(2) || "0.00"}
        </Text>
        <View
          style={[
            styles.statusBadge,
            item.status === "delivered"
              ? { backgroundColor: isDarkMode ? "#1A3A2A" : "#E6F7ED" }
              : { backgroundColor: isDarkMode ? "#3A2A0A" : "#FFF4E5" },
          ]}
        >
          <Text style={[styles.statusText, { color: colors.text }]}>
            {item.status === "delivered" ? "Entregado" : "Pendiente"}
          </Text>
        </View>
        <MaterialIcons
          name="chevron-right"
          size={24}
          color={colors.textTertiary}
        />
      </View>
    </TouchableOpacity>
  );
  return (
    <FlatList
      data={recentOrders}
      renderItem={renderOrderItem}
      keyExtractor={(item) => item.id}
      scrollEnabled={false}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
      ListEmptyComponent={() => (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No hay pedidos recientes</Text>
        </View>
      )}
    />
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: "#666",
  },
  emptyContainer: {
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    backgroundColor: "#F0F0F0",
  },
  emptyText: {
    fontSize: 16,
    color: "#666",
    marginBottom: 10,
  },
  addButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: "#6C63FF",
    borderRadius: 20,
  },
  addButtonText: {
    color: "white",
    fontWeight: "500",
  },
  orderItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 14,
  },
  orderLeftContent: {
    flex: 2,
  },
  orderRightContent: {
    flex: 1,
    alignItems: "flex-end",
    justifyContent: "space-between",
  },
  clientName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  orderDetail: {
    fontSize: 14,
    color: "#666",
    marginBottom: 4,
  },
  orderDate: {
    fontSize: 12,
    color: "#999",
  },
  orderTotal: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 4,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    marginBottom: 4,
  },
  deliveredBadge: {
    backgroundColor: "#E6F7ED",
  },
  pendingBadge: {
    backgroundColor: "#FFF4E5",
  },
  statusText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#333",
  },
  separator: {
    height: 1,
    backgroundColor: "#F0F0F0",
    marginVertical: 4,
  },
});
