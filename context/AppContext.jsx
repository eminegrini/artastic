import React, {
  createContext,
  useReducer,
  useContext,
  ReactNode,
  useEffect,
} from "react";
import {
  supabaseService,
  Piece,
  Filament,
  Client,
  Order,
  OrderItem,
} from "../services/supabaseClient";
import { toast } from "sonner-native";

const initialState = {
  pieces: [],
  filaments: [],
  clients: [],
  orders: [],
  loading: false,
  error: null,
};

const appReducer = (state, action) => {
  switch (action.type) {
    case "SET_LOADING":
      return { ...state, loading: action.payload };
    case "SET_ERROR":
      return { ...state, error: action.payload };
    case "SET_PIECES":
      return { ...state, pieces: action.payload };
    case "ADD_PIECE":
      return { ...state, pieces: [...state.pieces, action.payload] };
    case "UPDATE_PIECE":
      return {
        ...state,
        pieces: state.pieces.map((piece) =>
          piece.id === action.payload.id ? action.payload : piece
        ),
      };
    case "DELETE_PIECE":
      return {
        ...state,
        pieces: state.pieces.filter((piece) => piece.id !== action.payload),
      };
    case "SET_FILAMENTS":
      return { ...state, filaments: action.payload };
    case "ADD_FILAMENT":
      return { ...state, filaments: [...state.filaments, action.payload] };
    case "UPDATE_FILAMENT":
      return {
        ...state,
        filaments: state.filaments.map((filament) =>
          filament.id === action.payload.id ? action.payload : filament
        ),
      };
    case "DELETE_FILAMENT":
      return {
        ...state,
        filaments: state.filaments.filter(
          (filament) => filament.id !== action.payload
        ),
      };
    case "SET_CLIENTS":
      return { ...state, clients: action.payload };
    case "ADD_CLIENT":
      return { ...state, clients: [...state.clients, action.payload] };
    case "UPDATE_CLIENT":
      return {
        ...state,
        clients: state.clients.map((client) =>
          client.id === action.payload.id ? action.payload : client
        ),
      };
    case "DELETE_CLIENT":
      return {
        ...state,
        clients: state.clients.filter((client) => client.id !== action.payload),
      };
    case "SET_ORDERS":
      return { ...state, orders: action.payload };
    case "ADD_ORDER":
      return { ...state, orders: [action.payload, ...state.orders] };
    case "UPDATE_ORDER":
      return {
        ...state,
        orders: state.orders.map((order) =>
          order.id === action.payload.id ? action.payload : order
        ),
      };
    case "DELETE_ORDER":
      return {
        ...state,
        orders: state.orders.filter((order) => order.id !== action.payload),
      };
    default:
      return state;
  }
};

// Create the context

const AppContext = createContext(); // Create provider component

export const AppProvider = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // Cargar datos iniciales
  useEffect(() => {
    fetchPieces();
    fetchFilaments();
    fetchClients();
    fetchOrders();
  }, []);

  // Implementación de funciones
  const fetchPieces = async () => {
    try {
      dispatch({ type: "SET_LOADING", payload: true });
      const pieces = await supabaseService.getPieces();
      dispatch({ type: "SET_PIECES", payload: pieces });
    } catch (error) {
      console.error("Error fetching pieces:", error);
      dispatch({ type: "SET_ERROR", payload: "Error al cargar las piezas" });
      toast.error("Error al cargar las piezas");
    } finally {
      dispatch({ type: "SET_LOADING", payload: false });
    }
  };

  const fetchFilaments = async () => {
    try {
      dispatch({ type: "SET_LOADING", payload: true });
      const filaments = await supabaseService.getFilaments();
      dispatch({ type: "SET_FILAMENTS", payload: filaments });
    } catch (error) {
      console.error("Error fetching filaments:", error);
      dispatch({
        type: "SET_ERROR",
        payload: "Error al cargar los filamentos",
      });
      toast.error("Error al cargar los filamentos");
    } finally {
      dispatch({ type: "SET_LOADING", payload: false });
    }
  };

  const fetchClients = async () => {
    try {
      dispatch({ type: "SET_LOADING", payload: true });
      const clients = await supabaseService.getClients();
      dispatch({ type: "SET_CLIENTS", payload: clients });
    } catch (error) {
      console.error("Error fetching clients:", error);
      dispatch({ type: "SET_ERROR", payload: "Error al cargar los clientes" });
      toast.error("Error al cargar los clientes");
    } finally {
      dispatch({ type: "SET_LOADING", payload: false });
    }
  };

  const fetchOrders = async () => {
    try {
      dispatch({ type: "SET_LOADING", payload: true });
      const orders = await supabaseService.getOrders();
      dispatch({ type: "SET_ORDERS", payload: orders });
    } catch (error) {
      console.error("Error fetching orders:", error);
      dispatch({ type: "SET_ERROR", payload: "Error al cargar los pedidos" });
      toast.error("Error al cargar los pedidos");
    } finally {
      dispatch({ type: "SET_LOADING", payload: false });
    }
  };

  const addPiece = async (piece) => {
    try {
      dispatch({ type: "SET_LOADING", payload: true });
      const newPiece = await supabaseService.createPiece(piece);
      dispatch({ type: "ADD_PIECE", payload: newPiece });
      toast.success("Pieza añadida correctamente");
    } catch (error) {
      console.error("Error adding piece:", error);
      dispatch({ type: "SET_ERROR", payload: "Error al añadir la pieza" });
      toast.error("Error al añadir la pieza");
    } finally {
      dispatch({ type: "SET_LOADING", payload: false });
    }
  };

  const updatePiece = async (id, updates) => {
    try {
      dispatch({ type: "SET_LOADING", payload: true });
      const updatedPiece = await supabaseService.updatePiece(id, updates);
      dispatch({ type: "UPDATE_PIECE", payload: updatedPiece });
      toast.success("Pieza actualizada correctamente");
    } catch (error) {
      console.error("Error updating piece:", error);
      dispatch({ type: "SET_ERROR", payload: "Error al actualizar la pieza" });
      toast.error("Error al actualizar la pieza");
    } finally {
      dispatch({ type: "SET_LOADING", payload: false });
    }
  };

  const deletePiece = async (id) => {
    try {
      dispatch({ type: "SET_LOADING", payload: true });
      await supabaseService.deletePiece(id);
      dispatch({ type: "DELETE_PIECE", payload: id });
      toast.success("Pieza eliminada correctamente");
    } catch (error) {
      console.error("Error deleting piece:", error);
      dispatch({ type: "SET_ERROR", payload: "Error al eliminar la pieza" });
      toast.error("Error al eliminar la pieza");
    } finally {
      dispatch({ type: "SET_LOADING", payload: false });
    }
  };

  const addFilament = async (filament) => {
    try {
      dispatch({ type: "SET_LOADING", payload: true });
      const newFilament = await supabaseService.createFilament(filament);
      dispatch({ type: "ADD_FILAMENT", payload: newFilament });
      toast.success("Filamento añadido correctamente");
    } catch (error) {
      console.error("Error adding filament:", error);
      dispatch({ type: "SET_ERROR", payload: "Error al añadir el filamento" });
      toast.error("Error al añadir el filamento");
    } finally {
      dispatch({ type: "SET_LOADING", payload: false });
    }
  };

  const updateFilament = async (id, updates) => {
    try {
      dispatch({ type: "SET_LOADING", payload: true });
      const updatedFilament = await supabaseService.updateFilament(id, updates);
      dispatch({ type: "UPDATE_FILAMENT", payload: updatedFilament });
      toast.success("Filamento actualizado correctamente");
    } catch (error) {
      console.error("Error updating filament:", error);
      dispatch({
        type: "SET_ERROR",
        payload: "Error al actualizar el filamento",
      });
      toast.error("Error al actualizar el filamento");
    } finally {
      dispatch({ type: "SET_LOADING", payload: false });
    }
  };

  const deleteFilament = async (id) => {
    try {
      dispatch({ type: "SET_LOADING", payload: true });
      await supabaseService.deleteFilament(id);
      dispatch({ type: "DELETE_FILAMENT", payload: id });
      toast.success("Filamento eliminado correctamente");
    } catch (error) {
      console.error("Error deleting filament:", error);
      dispatch({
        type: "SET_ERROR",
        payload: "Error al eliminar el filamento",
      });
      toast.error("Error al eliminar el filamento");
    } finally {
      dispatch({ type: "SET_LOADING", payload: false });
    }
  };

  const addClient = async (client) => {
    try {
      dispatch({ type: "SET_LOADING", payload: true });
      const newClient = await supabaseService.createClient(client);
      dispatch({ type: "ADD_CLIENT", payload: newClient });
      toast.success("Cliente añadido correctamente");
    } catch (error) {
      console.error("Error adding client:", error);
      dispatch({ type: "SET_ERROR", payload: "Error al añadir el cliente" });
      toast.error("Error al añadir el cliente");
    } finally {
      dispatch({ type: "SET_LOADING", payload: false });
    }
  };

  const updateClient = async (id, updates) => {
    try {
      dispatch({ type: "SET_LOADING", payload: true });
      const updatedClient = await supabaseService.updateClient(id, updates);
      dispatch({ type: "UPDATE_CLIENT", payload: updatedClient });
      toast.success("Cliente actualizado correctamente");
    } catch (error) {
      console.error("Error updating client:", error);
      dispatch({
        type: "SET_ERROR",
        payload: "Error al actualizar el cliente",
      });
      toast.error("Error al actualizar el cliente");
    } finally {
      dispatch({ type: "SET_LOADING", payload: false });
    }
  };

  const deleteClient = async (id) => {
    try {
      dispatch({ type: "SET_LOADING", payload: true });
      await supabaseService.deleteClient(id);
      dispatch({ type: "DELETE_CLIENT", payload: id });
      toast.success("Cliente eliminado correctamente");
    } catch (error) {
      console.error("Error deleting client:", error);
      dispatch({ type: "SET_ERROR", payload: "Error al eliminar el cliente" });
      toast.error("Error al eliminar el cliente");
    } finally {
      dispatch({ type: "SET_LOADING", payload: false });
    }
  };

  const addOrder = async (order, items) => {
    try {
      dispatch({ type: "SET_LOADING", payload: true });
      const newOrder = await supabaseService.createOrder(order, items);
      dispatch({ type: "ADD_ORDER", payload: newOrder });
      toast.success("Pedido añadido correctamente");
    } catch (error) {
      console.error("Error adding order:", error);
      dispatch({ type: "SET_ERROR", payload: "Error al añadir el pedido" });
      toast.error("Error al añadir el pedido");
    } finally {
      dispatch({ type: "SET_LOADING", payload: false });
    }
  };

  const updateOrder = async (id, updates) => {
    try {
      dispatch({ type: "SET_LOADING", payload: true });
      const updatedOrder = await supabaseService.updateOrder(id, updates);
      dispatch({ type: "UPDATE_ORDER", payload: updatedOrder });
      toast.success("Pedido actualizado correctamente");
    } catch (error) {
      console.error("Error updating order:", error);
      dispatch({ type: "SET_ERROR", payload: "Error al actualizar el pedido" });
      toast.error("Error al actualizar el pedido");
    } finally {
      dispatch({ type: "SET_LOADING", payload: false });
    }
  };

  const deleteOrder = async (id) => {
    try {
      dispatch({ type: "SET_LOADING", payload: true });
      await supabaseService.deleteOrder(id);
      dispatch({ type: "DELETE_ORDER", payload: id });
      toast.success("Pedido eliminado correctamente");
    } catch (error) {
      console.error("Error deleting order:", error);
      dispatch({ type: "SET_ERROR", payload: "Error al eliminar el pedido" });
      toast.error("Error al eliminar el pedido");
    } finally {
      dispatch({ type: "SET_LOADING", payload: false });
    }
  };

  return (
    <AppContext.Provider
      value={{
        state,
        dispatch,
        fetchPieces,
        fetchFilaments,
        fetchClients,
        fetchOrders,
        addPiece,
        updatePiece,
        deletePiece,
        addFilament,
        updateFilament,
        deleteFilament,
        addClient,
        updateClient,
        deleteClient,
        addOrder,
        updateOrder,
        deleteOrder,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

// Custom hook to use the context
export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error("useAppContext must be used within an AppProvider");
  }
  return context;
};
