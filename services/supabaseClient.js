import { createClient } from "@supabase/supabase-js";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Configuración de Supabase
const supabaseUrl = "https://foekwfnywmbivyvrunwa.supabase.co";
const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZvZWt3Zm55d21iaXZ5dnJ1bndhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDA4NDExODcsImV4cCI6MjA1NjQxNzE4N30.XsBdQfwmKpaccc3ad-ugO1UI3n9tkV9jMArFYvczwEQ";

// Crear el cliente de Supabase
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === "web",
  },
});

// Funciones para interactuar con la base de datos
export const supabaseService = {
  // Funciones para piezas
  async getPieces() {
    const { data, error } = await supabase
      .from("pieces")
      .select("*")
      .order("name");

    if (error) {
      console.error("Error fetching pieces:", error);
      throw error;
    }

    return data || [];
  },

  async getPieceById(id) {
    const { data, error } = await supabase
      .from("pieces")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      console.error(`Error fetching piece ${id}:`, error);
      throw error;
    }

    return data;
  },

  async createPiece(piece) {
    const { data, error } = await supabase
      .from("pieces")
      .insert([piece])
      .select()
      .single();

    if (error) {
      console.error("Error creating piece:", error);
      throw error;
    }

    return data;
  },

  async updatePiece(id, updates) {
    const { data, error } = await supabase
      .from("pieces")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error(`Error updating piece ${id}:`, error);
      throw error;
    }

    return data;
  },

  async deletePiece(id) {
    const { error } = await supabase.from("pieces").delete().eq("id", id);

    if (error) {
      console.error(`Error deleting piece ${id}:`, error);
      throw error;
    }
  },

  // Funciones para filamentos
  async getFilaments() {
    const { data, error } = await supabase
      .from("filaments")
      .select("*")
      .order("type");

    if (error) {
      console.error("Error fetching filaments:", error);
      throw error;
    }

    return data || [];
  },

  async getFilamentById(id) {
    const { data, error } = await supabase
      .from("filaments")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      console.error(`Error fetching filament ${id}:`, error);
      throw error;
    }

    return data;
  },

  async createFilament(filament) {
    const { data, error } = await supabase
      .from("filaments")
      .insert([filament])
      .select()
      .single();

    if (error) {
      console.error("Error creating filament:", error);
      throw error;
    }

    return data;
  },

  async updateFilament(id, updates) {
    const { data, error } = await supabase
      .from("filaments")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error(`Error updating filament ${id}:`, error);
      throw error;
    }

    return data;
  },

  async deleteFilament(id) {
    const { error } = await supabase.from("filaments").delete().eq("id", id);

    if (error) {
      console.error(`Error deleting filament ${id}:`, error);
      throw error;
    }
  },

  // Funciones para clientes
  async getClients() {
    const { data, error } = await supabase
      .from("clients")
      .select("*")
      .order("name");

    if (error) {
      console.error("Error fetching clients:", error);
      throw error;
    }

    return data || [];
  },

  async getClientById(id) {
    const { data, error } = await supabase
      .from("clients")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      console.error(`Error fetching client ${id}:`, error);
      throw error;
    }

    return data;
  },

  async createClient(client) {
    const { data, error } = await supabase
      .from("clients")
      .insert([client])
      .select()
      .single();

    if (error) {
      console.error("Error creating client:", error);
      throw error;
    }

    return data;
  },

  async updateClient(id, updates) {
    const { data, error } = await supabase
      .from("clients")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error(`Error updating client ${id}:`, error);
      throw error;
    }

    return data;
  },

  async deleteClient(id) {
    const { error } = await supabase.from("clients").delete().eq("id", id);

    if (error) {
      console.error(`Error deleting client ${id}:`, error);
      throw error;
    }
  },

  // Funciones para pedidos
  async getOrders() {
    const { data, error } = await supabase
      .from("orders")
      .select(
        `
        *,
        clients (*)
      `
      )
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching orders:", error);
      throw error;
    }

    // Obtener los items de cada pedido
    const ordersWithItems = await Promise.all(
      (data || []).map(async (order) => {
        const { data: items, error: itemsError } = await supabase
          .from("order_items")
          .select("*")
          .eq("order_id", order.id);

        if (itemsError) {
          console.error(
            `Error fetching items for order ${order.id}:`,
            itemsError
          );
          return { ...order, items: [] };
        }

        return { ...order, items: items || [] };
      })
    );

    return ordersWithItems;
  },

  async getOrderById(id) {
    const { data, error } = await supabase
      .from("orders")
      .select(
        `
        *,
        clients (*)
      `
      )
      .eq("id", id)
      .single();

    if (error) {
      console.error(`Error fetching order ${id}:`, error);
      throw error;
    }

    if (!data) return null;

    // Obtener los items del pedido
    const { data: items, error: itemsError } = await supabase
      .from("order_items")
      .select("*")
      .eq("order_id", id);

    if (itemsError) {
      console.error(`Error fetching items for order ${id}:`, itemsError);
      return { ...data, items: [] };
    }

    return { ...data, items: items || [] };
  },

  async createOrder(order, items) {
    // Iniciar una transacción
    const { data: orderData, error: orderError } = await supabase
      .from("orders")
      .insert([
        {
          client_name: order.client_name,
          client_id: order.client_id,
          total_price: order.total_price,
          status: order.status,
          delivery_date: order.delivery_date,
        },
      ])
      .select()
      .single();

    if (orderError) {
      console.error("Error creating order:", orderError);
      throw orderError;
    }

    // Agregar los items del pedido
    const orderItems = items.map((item) => ({
      order_id: orderData.id,
      piece_id: item.piece_id,
      quantity: item.quantity,
      price_per_unit: item.price_per_unit,
    }));

    const { error: itemsError } = await supabase
      .from("order_items")
      .insert(orderItems);

    if (itemsError) {
      console.error("Error creating order items:", itemsError);
      // Intentar eliminar el pedido si hubo un error con los items
      await supabase.from("orders").delete().eq("id", orderData.id);
      throw itemsError;
    }

    return { ...orderData, items };
  },

  async updateOrder(id, updates) {
    console.log("<<<<<<<<<<<<<<<<<actua", updates);
    const { data, error } = await supabase
      .from("orders")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error(`Error updating order ${id}:`, error);
      throw error;
    }

    return data;
  },

  async deleteOrder(id) {
    const { error } = await supabase.from("orders").delete().eq("id", id);

    if (error) {
      console.error(`Error deleting order ${id}:`, error);
      throw error;
    }
  },

  // Funciones para estadísticas
  async getSalesSummary(timeframe) {
    let interval;

    switch (timeframe) {
      case "daily":
        interval = "1 day";
        break;
      case "weekly":
        interval = "1 week";
        break;
      case "monthly":
        interval = "1 month";
        break;
      default:
        interval = "1 week";
    }

    const { data, error } = await supabase.rpc("get_sales_summary", {
      time_interval: interval,
    });

    if (error) {
      console.error(`Error fetching ${timeframe} sales summary:`, error);
      throw error;
    }

    return data || [];
  },

  async getTopProducts() {
    const { data, error } = await supabase
      .from("top_products")
      .select("*")
      .limit(5);

    if (error) {
      console.error("Error fetching top products:", error);
      throw error;
    }

    return data || [];
  },
};

export { supabase };
