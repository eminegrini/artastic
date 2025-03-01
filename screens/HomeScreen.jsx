import React, { useEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { BarChart } from "react-native-chart-kit";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  MaterialCommunityIcons,
  Ionicons,
  FontAwesome5,
} from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { StatusCard } from "../components/StatusCard";
import { RecentOrdersList } from "../components/RecentOrdersList";
import { useAppContext } from "../context/AppContext";
import { useTheme, getThemeColors } from "../context/ThemeContext";
import { supabase } from "../services/supabaseClient";

export default function HomeScreen() {
  const navigation = useNavigation();
  const { state, fetchPieces, fetchFilaments, fetchClients, fetchOrders } =
    useAppContext();
  const { pieces, filaments, clients, orders, loading } = state;

  // Cargar datos al inicio
  useEffect(() => {
    fetchPieces();
    fetchFilaments();
    fetchClients();
    fetchOrders();
  }, []);

  const pendingOrders = orders.filter(
    (order) => order.status === "pending"
  ).length;

  const { isDarkMode } = useTheme();
  const colors = getThemeColors(isDarkMode);

  const processMonthlyData = () => {
    if (!orders || orders.length === 0) {
      return {
        labels: ["Sem 1", "Sem 2", "Sem 3", "Sem 4"],
        data: [0, 0, 0, 0],
      };
    }

    // Filtrar órdenes entregadas de los últimos 30 días
    const now = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(now.getDate() - 30);

    const recentOrders = orders.filter(
      (order) =>
        order.status === "delivered" &&
        new Date(order.created_at) >= thirtyDaysAgo
    );

    // Agrupar por semana (últimas 4 semanas)
    const weeklyData = [0, 0, 0, 0]; // 4 semanas
    const weekLabels = ["Sem 1", "Sem 2", "Sem 3", "Sem 4"];

    recentOrders.forEach((order) => {
      if (!order.created_at || !order.total_price) return;

      const orderDate = new Date(order.created_at);
      const diffDays = Math.floor(
        (now.getTime() - orderDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      // Determinar a qué semana pertenece
      if (diffDays < 8) {
        weeklyData[3] += order.total_price; // Semana 4 (actual)
      } else if (diffDays < 15) {
        weeklyData[2] += order.total_price; // Semana 3
      } else if (diffDays < 22) {
        weeklyData[1] += order.total_price; // Semana 2
      } else if (diffDays < 30) {
        weeklyData[0] += order.total_price; // Semana 1
      }
    });

    return {
      labels: weekLabels,
      data: weeklyData,
    };
  };

  const chartData = useMemo(processMonthlyData, [orders]);

  if (loading && pieces.length === 0) {
    return (
      <SafeAreaView style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color="#6C63FF" />
        <Text style={styles.loadingText}>Cargando datos...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.welcomeText}>Bienvenido a</Text>
          <Text style={styles.titleText}>Artastic 3D</Text>
        </View>
        <View style={styles.headerButtons}>
          <TouchableOpacity
            style={styles.profileButton}
            onPress={() => navigation.navigate("Profile")}
          >
            <Ionicons name="person-circle" size={40} color="#6C63FF" />
          </TouchableOpacity>
        </View>
      </View>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Dashboard cards */}
        <View style={styles.cardsContainer}>
          <StatusCard
            title="Piezas"
            count={pieces.length}
            icon={<FontAwesome5 name="cubes" size={24} color="#6C63FF" />}
            onPress={() => navigation.navigate("Stock")}
          />
          <StatusCard
            title="Filamentos"
            count={filaments.length}
            icon={
              <MaterialCommunityIcons
                name="printer-3d-nozzle"
                size={24}
                color="#6C63FF"
              />
            }
            onPress={() => navigation.navigate("Stock")}
          />
          <StatusCard
            title="Pedidos"
            count={pendingOrders}
            icon={<Ionicons name="cart" size={24} color="#6C63FF" />}
            highlight={true}
            onPress={() => navigation.navigate("Orders")}
          />
          <StatusCard
            title="Clientes"
            count={clients.length}
            icon={<Ionicons name="people" size={24} color="#6C63FF" />}
            onPress={() => navigation.navigate("Clients")}
          />
        </View>
        {/* Summary section */}
        <View
          style={[styles.summaryContainer, { backgroundColor: colors.card }]}
        >
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Resumen Mensual
            </Text>
            <TouchableOpacity onPress={() => navigation.navigate("Sales")}>
              <Text style={[styles.seeMoreText, { color: colors.primary }]}>
                Ver más
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.summaryChart}>
            {orders.length > 0 ? (
              <BarChart
                data={{
                  labels: chartData.labels,
                  datasets: [
                    {
                      data: chartData.data,
                    },
                  ],
                }}
                width={styles.chartImage.width || screenWidth - 80}
                height={200}
                yAxisLabel="$"
                yAxisSuffix=""
                chartConfig={{
                  backgroundColor: colors.card,
                  backgroundGradientFrom: colors.card,
                  backgroundGradientTo: colors.card,
                  decimalPlaces: 0,
                  color: (opacity = 1) => `rgba(108, 99, 255, ${opacity})`,
                  labelColor: (opacity = 1) => colors.textSecondary,
                  style: {
                    borderRadius: 16,
                  },
                  barPercentage: 0.7,
                }}
                style={{
                  marginVertical: 8,
                  borderRadius: 8,
                }}
                showValuesOnTopOfBars
              />
            ) : (
              <View style={styles.noDataContainer}>
                <Text
                  style={[styles.noDataText, { color: colors.textSecondary }]}
                >
                  No hay datos suficientes para mostrar el gráfico
                </Text>
              </View>
            )}
          </View>
        </View>
        {/* Recent orders section */}
        <View style={styles.ordersContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Pedidos Recientes</Text>
            <TouchableOpacity onPress={() => navigation.navigate("Orders")}>
              <Text style={styles.seeMoreText}>Ver todos</Text>
            </TouchableOpacity>
          </View>

          <RecentOrdersList />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const screenWidth = Dimensions.get("window").width;

const styles = StyleSheet.create({
  loadingContainer: {
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#666",
  },
  container: {
    flex: 1,
    backgroundColor: "#F7F8FC",
    paddingBottom: 20,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  headerButtons: {
    flexDirection: "row",
    alignItems: "center",
  },
  welcomeText: {
    fontSize: 16,
    color: "#666",
  },
  titleText: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
  },
  profileButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  cardsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  summaryContainer: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  seeMoreText: {
    fontSize: 14,
    color: "#6C63FF",
    fontWeight: "600",
  },
  summaryChart: {
    height: 200,
    borderRadius: 8,
    overflow: "hidden",
  },
  chartImage: {
    width: "100%",
    height: "100%",
  },
  noDataContainer: {
    height: 200,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  noDataText: {
    fontSize: 14,
    textAlign: "center",
  },
  ordersContainer: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
});
