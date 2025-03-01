import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useTheme, getThemeColors } from "../context/ThemeContext";
import { useAppContext } from "../context/AppContext";
import { BarChart, PieChart, LineChart } from "react-native-chart-kit";

const screenWidth = Dimensions.get("window").width;

export default function SalesScreen() {
  const navigation = useNavigation();
  const { isDarkMode } = useTheme();
  const colors = getThemeColors(isDarkMode);
  const [timeFrame, setTimeFrame] = useState("weekly");
  const [chartType, setChartType] = useState("revenue");
  const { state, fetchOrders, fetchPieces } = useAppContext();
  const { orders, pieces } = state;

  useEffect(() => {
    fetchOrders();
    fetchPieces();
  }, []);

  // Procesar datos para gráficos según el período seleccionado
  const processChartData = useMemo(() => {
    if (!orders || orders.length === 0 || !pieces) {
      return {
        barChartData: {
          labels: [],
          datasets: [{ data: [0] }],
        },
        pieChartData: [],
        lineChartData: {
          labels: [],
          datasets: [{ data: [0] }],
        },
        topProducts: [],
      };
    }

    // Filtrar órdenes entregadas
    const deliveredOrders = orders.filter(
      (order) => order.status === "delivered"
    );

    // Objeto para almacenar datos de ventas según el período
    let periodData = {};
    let labels = [];
    let revenueData = [];
    let ordersData = [];

    // Configurar etiquetas y agrupar datos según el período
    const now = new Date();

    if (timeFrame === "daily") {
      // Configurar para los últimos 7 días
      labels = Array.from({ length: 7 }, (_, i) => {
        const date = new Date();
        date.setDate(now.getDate() - 6 + i);
        return date.getDate() + "/" + (date.getMonth() + 1);
      });

      // Inicializar datos para cada día
      labels.forEach((label, index) => {
        const date = new Date();
        date.setDate(now.getDate() - 6 + index);
        periodData[label] = { revenue: 0, orders: 0, date: new Date(date) };
      });

      // Agrupar órdenes por día
      deliveredOrders.forEach((order) => {
        if (!order.created_at) return;

        const orderDate = new Date(order.created_at);
        // Solo considerar órdenes de los últimos 7 días
        const diffTime = Math.abs(now - orderDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays <= 7) {
          const label = orderDate.getDate() + "/" + (orderDate.getMonth() + 1);
          if (periodData[label]) {
            periodData[label].revenue += order.total_price || 0;
            periodData[label].orders += 1;
          }
        }
      });
    } else if (timeFrame === "weekly") {
      // Configurar para las últimas 4 semanas
      labels = Array.from({ length: 4 }, (_, i) => {
        const weekNum = i + 1;
        return `Sem ${weekNum}`;
      });

      // Inicializar datos para cada semana
      labels.forEach((label, index) => {
        periodData[label] = { revenue: 0, orders: 0 };
      });

      // Agrupar órdenes por semana
      deliveredOrders.forEach((order) => {
        if (!order.created_at) return;

        const orderDate = new Date(order.created_at);
        // Solo considerar órdenes del último mes
        const diffTime = Math.abs(now - orderDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays <= 28) {
          // Determinar a qué semana pertenece
          const weekNumber = Math.ceil(diffDays / 7);
          const label = `Sem ${4 - weekNumber + 1}`;

          if (periodData[label]) {
            periodData[label].revenue += order.total_price || 0;
            periodData[label].orders += 1;
          }
        }
      });
    } else if (timeFrame === "monthly") {
      // Configurar para los últimos 6 meses
      const monthNames = [
        "Ene",
        "Feb",
        "Mar",
        "Abr",
        "May",
        "Jun",
        "Jul",
        "Ago",
        "Sep",
        "Oct",
        "Nov",
        "Dic",
      ];
      labels = Array.from({ length: 6 }, (_, i) => {
        let monthIndex = now.getMonth() - 5 + i;
        if (monthIndex < 0) monthIndex += 12;
        return monthNames[monthIndex];
      });

      // Inicializar datos para cada mes
      labels.forEach((label) => {
        periodData[label] = { revenue: 0, orders: 0 };
      });

      // Agrupar órdenes por mes
      deliveredOrders.forEach((order) => {
        if (!order.created_at) return;

        const orderDate = new Date(order.created_at);
        // Solo considerar órdenes de los últimos 6 meses
        const monthDiff =
          (now.getFullYear() - orderDate.getFullYear()) * 12 +
          now.getMonth() -
          orderDate.getMonth();

        if (monthDiff < 6) {
          const label = monthNames[orderDate.getMonth()];
          if (periodData[label]) {
            periodData[label].revenue += order.total_price || 0;
            periodData[label].orders += 1;
          }
        }
      });
    }

    // Extraer datos para gráficos
    labels.forEach((label) => {
      revenueData.push(periodData[label]?.revenue || 0);
      ordersData.push(periodData[label]?.orders || 0);
    });

    // Calcular productos más vendidos
    const productCountMap = {};
    const productRevenueMap = {};

    deliveredOrders.forEach((order) => {
      if (order.items && order.items.length) {
        order.items.forEach((item) => {
          if (!productCountMap[item.piece_id]) {
            productCountMap[item.piece_id] = 0;
            productRevenueMap[item.piece_id] = 0;
          }
          productCountMap[item.piece_id] += item.quantity || 0;
          productRevenueMap[item.piece_id] +=
            (item.price_per_unit || 0) * (item.quantity || 0);
        });
      }
    });

    // Obtener nombres de productos y ordenar por cantidad vendida
    const topProducts = Object.keys(productCountMap)
      .map((pieceId) => {
        const piece = pieces.find((p) => p.id === pieceId);
        return {
          id: pieceId,
          name: piece ? piece.name : "Producto desconocido",
          count: productCountMap[pieceId],
          revenue: productRevenueMap[pieceId],
        };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Datos para gráfico circular de productos
    const pieChartData = topProducts.map((product, index) => {
      const colors = ["#FF6384", "#36A2EB", "#FFCE56", "#4BC0C0", "#9966FF"];
      return {
        name: product.name,
        count: product.count,
        revenue: product.revenue,
        color: colors[index % colors.length],
        legendFontColor: isDarkMode ? "#E0E0E0" : "#7F7F7F",
        legendFontSize: 12,
      };
    });

    return {
      barChartData: {
        labels,
        datasets: [
          {
            data: chartType === "revenue" ? revenueData : ordersData,
          },
        ],
      },
      pieChartData,
      lineChartData: {
        labels,
        datasets: [
          {
            data: chartType === "revenue" ? revenueData : ordersData,
            color: (opacity = 1) => `rgba(108, 99, 255, ${opacity})`,
            strokeWidth: 2,
          },
        ],
      },
      topProducts,
    };
  }, [timeFrame, chartType, orders, pieces, isDarkMode]);

  // Calcular estadísticas de ventas basadas en pedidos reales
  const calculateSalesData = () => {
    if (!orders || orders.length === 0) {
      return {
        total: 0,
        orders: 0,
        topProduct: "Sin ventas",
        percentChange: 0,
      };
    }

    // Filtrar ordenes por tiempo
    const now = new Date();
    const deliveredOrders = orders.filter(
      (order) => order.status === "delivered"
    );

    let timeFilteredOrders;
    let previousPeriodOrders;

    switch (timeFrame) {
      case "daily":
        // Ordenes de hoy
        timeFilteredOrders = deliveredOrders.filter((order) => {
          const orderDate = new Date(order.created_at);
          return orderDate.setHours(0, 0, 0, 0) === now.setHours(0, 0, 0, 0);
        });
        // Ordenes de ayer
        previousPeriodOrders = deliveredOrders.filter((order) => {
          const orderDate = new Date(order.created_at);
          const yesterday = new Date();
          yesterday.setDate(now.getDate() - 1);
          return (
            orderDate.setHours(0, 0, 0, 0) === yesterday.setHours(0, 0, 0, 0)
          );
        });
        break;
      case "weekly":
        // Ordenes de esta semana
        timeFilteredOrders = deliveredOrders.filter((order) => {
          const orderDate = new Date(order.created_at);
          const dayOfWeek = orderDate.getDay();
          const diff =
            orderDate.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
          const startOfWeek = new Date(orderDate.setDate(diff));
          startOfWeek.setHours(0, 0, 0, 0);
          const endOfWeek = new Date(startOfWeek);
          endOfWeek.setDate(startOfWeek.getDate() + 6);
          endOfWeek.setHours(23, 59, 59, 999);

          return orderDate >= startOfWeek && orderDate <= endOfWeek;
        });
        // Ordenes de la semana pasada
        previousPeriodOrders = deliveredOrders.filter((order) => {
          const orderDate = new Date(order.created_at);
          const dayOfWeek = orderDate.getDay();
          const diff =
            orderDate.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
          const startOfWeek = new Date(orderDate.setDate(diff));
          startOfWeek.setHours(0, 0, 0, 0);
          startOfWeek.setDate(startOfWeek.getDate() - 7);
          const endOfWeek = new Date(startOfWeek);
          endOfWeek.setDate(startOfWeek.getDate() + 6);
          endOfWeek.setHours(23, 59, 59, 999);

          return orderDate >= startOfWeek && orderDate <= endOfWeek;
        });
        break;
      case "monthly":
        // Ordenes de este mes
        timeFilteredOrders = deliveredOrders.filter((order) => {
          const orderDate = new Date(order.created_at);
          return (
            orderDate.getMonth() === now.getMonth() &&
            orderDate.getFullYear() === now.getFullYear()
          );
        });
        // Ordenes del mes pasado
        previousPeriodOrders = deliveredOrders.filter((order) => {
          const orderDate = new Date(order.created_at);
          const prevMonth = now.getMonth() - 1;
          const year =
            prevMonth < 0 ? now.getFullYear() - 1 : now.getFullYear();
          const month = prevMonth < 0 ? 11 : prevMonth;
          return (
            orderDate.getMonth() === month && orderDate.getFullYear() === year
          );
        });
        break;
      default:
        timeFilteredOrders = [];
        previousPeriodOrders = [];
    }

    // Calcular total de ventas
    const total = timeFilteredOrders.reduce(
      (sum, order) => sum + (order.total_price || 0),
      0
    );

    // Calcular producto más vendido
    const productCountMap = {};
    timeFilteredOrders.forEach((order) => {
      if (order.items && order.items.length) {
        order.items.forEach((item) => {
          if (!productCountMap[item.piece_id]) {
            productCountMap[item.piece_id] = 0;
          }
          productCountMap[item.piece_id] += item.quantity || 0;
        });
      }
    });

    let topProductId = null;
    let maxCount = 0;

    Object.keys(productCountMap).forEach((pieceId) => {
      if (productCountMap[pieceId] > maxCount) {
        maxCount = productCountMap[pieceId];
        topProductId = pieceId;
      }
    });

    const topProduct = pieces.find((piece) => piece.id === topProductId);
    const topProductName = topProduct ? topProduct.name : "Sin datos";

    // Calcular cambio porcentual
    const previousTotal = previousPeriodOrders.reduce(
      (sum, order) => sum + (order.total_price || 0),
      0
    );
    let percentChange = 0;

    if (previousTotal > 0) {
      percentChange = ((total - previousTotal) / previousTotal) * 100;
    }

    return {
      total: total,
      orders: timeFilteredOrders.length,
      topProduct: topProductName,
      percentChange: parseFloat(percentChange.toFixed(1)),
    };
  };

  // Get current data based on selected time frame
  const currentData = calculateSalesData();

  const chartConfig = {
    backgroundGradientFrom: isDarkMode ? "#1E1E1E" : "#FFFFFF",
    backgroundGradientTo: isDarkMode ? "#1E1E1E" : "#FFFFFF",
    decimalPlaces: 0,
    color: (opacity = 1) =>
      isDarkMode
        ? `rgba(255, 255, 255, ${opacity})`
        : `rgba(0, 0, 0, ${opacity})`,
    labelColor: (opacity = 1) =>
      isDarkMode
        ? `rgba(255, 255, 255, ${opacity})`
        : `rgba(0, 0, 0, ${opacity})`,
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: "6",
      strokeWidth: "2",
      stroke: "#6C63FF",
    },
  };

  // Renderizar gráfico según el tipo seleccionado
  const renderChart = () => {
    if (chartType === "products") {
      return (
        <PieChart
          data={processChartData.pieChartData}
          width={screenWidth - 48}
          height={200}
          chartConfig={chartConfig}
          accessor="count"
          backgroundColor="transparent"
          paddingLeft="15"
          center={[0, 0]}
          absolute
        />
      );
    } else if (chartType === "orders") {
      return (
        <LineChart
          data={processChartData.lineChartData}
          width={screenWidth - 48}
          height={200}
          chartConfig={chartConfig}
          bezier
        />
      );
    } else {
      return (
        <BarChart
          data={processChartData.barChartData}
          width={screenWidth - 48}
          height={200}
          chartConfig={chartConfig}
          fromZero
          showValuesOnTopOfBars
          showBarTops
        />
      );
    }
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Ventas</Text>
        <TouchableOpacity>
          <Ionicons name="calendar" size={24} color={colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Time frame selector */}
        <View
          style={[
            styles.timeFrameContainer,
            { backgroundColor: colors.border },
          ]}
        >
          <TouchableOpacity
            style={[
              styles.timeFrameButton,
              timeFrame === "daily" && [
                styles.activeTimeFrame,
                { backgroundColor: colors.card },
              ],
            ]}
            onPress={() => setTimeFrame("daily")}
          >
            <Text
              style={[
                styles.timeFrameText,
                { color: colors.textSecondary },
                timeFrame === "daily" && [
                  styles.activeTimeFrameText,
                  { color: colors.primary },
                ],
              ]}
            >
              Diario
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.timeFrameButton,
              timeFrame === "weekly" && [
                styles.activeTimeFrame,
                { backgroundColor: colors.card },
              ],
            ]}
            onPress={() => setTimeFrame("weekly")}
          >
            <Text
              style={[
                styles.timeFrameText,
                { color: colors.textSecondary },
                timeFrame === "weekly" && [
                  styles.activeTimeFrameText,
                  { color: colors.primary },
                ],
              ]}
            >
              Semanal
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.timeFrameButton,
              timeFrame === "monthly" && [
                styles.activeTimeFrame,
                { backgroundColor: colors.card },
              ],
            ]}
            onPress={() => setTimeFrame("monthly")}
          >
            <Text
              style={[
                styles.timeFrameText,
                { color: colors.textSecondary },
                timeFrame === "monthly" && [
                  styles.activeTimeFrameText,
                  { color: colors.primary },
                ],
              ]}
            >
              Mensual
            </Text>
          </TouchableOpacity>
        </View>

        {/* Sales summary */}
        <View
          style={[styles.summaryContainer, { backgroundColor: colors.card }]}
        >
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryLabel, { color: colors.textTertiary }]}>
              Ventas Totales
            </Text>
            <Text style={[styles.summaryValue, { color: colors.text }]}>
              ${currentData.total.toFixed(2)}
            </Text>
            <View style={styles.changeContainer}>
              <MaterialIcons
                name={
                  currentData.percentChange >= 0
                    ? "arrow-upward"
                    : "arrow-downward"
                }
                size={14}
                color={
                  currentData.percentChange >= 0 ? colors.success : colors.error
                }
              />
              <Text
                style={[
                  styles.changeText,
                  {
                    color:
                      currentData.percentChange >= 0
                        ? colors.success
                        : colors.error,
                  },
                ]}
              >
                {Math.abs(currentData.percentChange)}%
              </Text>
            </View>
          </View>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryLabel, { color: colors.textTertiary }]}>
              Pedidos
            </Text>
            <Text style={[styles.summaryValue, { color: colors.text }]}>
              {currentData.orders}
            </Text>
          </View>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryLabel, { color: colors.textTertiary }]}>
              Producto Estrella
            </Text>
            <Text style={[styles.summaryProductValue, { color: colors.text }]}>
              {currentData.topProduct}
            </Text>
          </View>
        </View>

        {/* Chart type selector */}
        <View style={styles.chartTypeContainer}>
          <TouchableOpacity
            style={[
              styles.chartTypeButton,
              { backgroundColor: colors.border },
              chartType === "revenue" && [
                styles.activeChartType,
                { backgroundColor: colors.primary },
              ],
            ]}
            onPress={() => setChartType("revenue")}
          >
            <Text
              style={[
                styles.chartTypeText,
                { color: colors.textSecondary },
                chartType === "revenue" && [
                  styles.activeChartTypeText,
                  { color: "white" },
                ],
              ]}
            >
              Ingresos
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.chartTypeButton,
              { backgroundColor: colors.border },
              chartType === "orders" && [
                styles.activeChartType,
                { backgroundColor: colors.primary },
              ],
            ]}
            onPress={() => setChartType("orders")}
          >
            <Text
              style={[
                styles.chartTypeText,
                { color: colors.textSecondary },
                chartType === "orders" && [
                  styles.activeChartTypeText,
                  { color: "white" },
                ],
              ]}
            >
              Pedidos
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.chartTypeButton,
              { backgroundColor: colors.border },
              chartType === "products" && [
                styles.activeChartType,
                { backgroundColor: colors.primary },
              ],
            ]}
            onPress={() => setChartType("products")}
          >
            <Text
              style={[
                styles.chartTypeText,
                { color: colors.textSecondary },
                chartType === "products" && [
                  styles.activeChartTypeText,
                  { color: "white" },
                ],
              ]}
            >
              Productos
            </Text>
          </TouchableOpacity>
        </View>

        {/* Chart */}
        <View style={[styles.chartContainer, { backgroundColor: colors.card }]}>
          {renderChart()}
        </View>

        {/* Top selling products */}
        <View
          style={[
            styles.topProductsContainer,
            { backgroundColor: colors.card },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Productos Más Vendidos
          </Text>

          {processChartData.topProducts.map((product, index) => (
            <View key={product.id} style={styles.productItem}>
              <View
                style={[styles.productRank, { backgroundColor: colors.border }]}
              >
                <Text
                  style={[styles.rankText, { color: colors.textSecondary }]}
                >
                  {index + 1}
                </Text>
              </View>
              <View style={styles.productInfo}>
                <Text style={[styles.productName, { color: colors.text }]}>
                  {product.name}
                </Text>
                <Text
                  style={[styles.productStat, { color: colors.textSecondary }]}
                >
                  {product.count} unidades • ${product.revenue.toFixed(2)}
                </Text>
              </View>
              <View
                style={[
                  styles.productPercentage,
                  {
                    backgroundColor: isDarkMode
                      ? "rgba(76, 175, 80, 0.2)"
                      : "#E6F7ED",
                  },
                ]}
              >
                <Text
                  style={[styles.percentageText, { color: colors.success }]}
                >
                  {Math.round(
                    (product.count /
                      processChartData.topProducts.reduce(
                        (sum, p) => sum + p.count,
                        0
                      )) *
                      100
                  )}
                  %
                </Text>
              </View>
            </View>
          ))}

          {processChartData.topProducts.length === 0 && (
            <Text
              style={[
                styles.productStat,
                {
                  color: colors.textSecondary,
                  textAlign: "center",
                  marginTop: 10,
                },
              ]}
            >
              No hay datos de ventas disponibles
            </Text>
          )}
        </View>
      </ScrollView>
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
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  timeFrameContainer: {
    flexDirection: "row",
    marginBottom: 16,
    borderRadius: 8,
    padding: 4,
  },
  timeFrameButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: 6,
  },
  activeTimeFrame: {
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  timeFrameText: {
    fontSize: 14,
    fontWeight: "500",
  },
  activeTimeFrameText: {
    fontWeight: "600",
  },
  summaryContainer: {
    flexDirection: "row",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  summaryItem: {
    flex: 1,
    alignItems: "center",
  },
  divider: {
    width: 1,
    marginHorizontal: 8,
  },
  summaryLabel: {
    fontSize: 12,
    marginBottom: 4,
    textAlign: "center",
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 4,
  },
  summaryProductValue: {
    fontSize: 14,
    fontWeight: "bold",
    textAlign: "center",
  },
  changeContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  changeText: {
    fontSize: 12,
    fontWeight: "500",
    marginLeft: 2,
  },
  chartTypeContainer: {
    flexDirection: "row",
    marginBottom: 16,
  },
  chartTypeButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginRight: 8,
    borderRadius: 20,
  },
  activeChartType: {},
  chartTypeText: {
    fontSize: 14,
    fontWeight: "500",
  },
  activeChartTypeText: {
    fontWeight: "600",
  },
  chartContainer: {
    borderRadius: 12,
    padding: 10,
    marginBottom: 24,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  topProductsContainer: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 16,
  },
  productItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  productRank: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  rankText: {
    fontSize: 14,
    fontWeight: "bold",
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 2,
  },
  productStat: {
    fontSize: 13,
  },
  productPercentage: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  percentageText: {
    fontSize: 12,
    fontWeight: "bold",
  },
});
