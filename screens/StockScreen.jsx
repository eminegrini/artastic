import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useAppContext } from "../context/AppContext";
import { toast } from "sonner-native";
import * as ImagePicker from "expo-image-picker";
import { CameraView } from "expo-camera";
import {
  getApiImageUrl,
  uploadToCloudinary,
} from "../services/cloudinaryService";

export default function StockScreen() {
  const navigation = useNavigation();
  const [activeTab, setActiveTab] = useState("pieces");
  const {
    state,
    fetchPieces,
    fetchFilaments,
    addPiece,
    updatePiece,
    deletePiece,
    addFilament,
    updateFilament,
    deleteFilament,
  } = useAppContext();
  const { pieces, filaments, loading } = state;

  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [filteredItems, setFilteredItems] = useState([]);

  // Modal states
  const [modalVisible, setModalVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentItem, setCurrentItem] = useState(null); // Form states for pieces
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [imageBase64, setImageBase64] = useState("");
  const [stock, setStock] = useState("");
  const [wholesalePrice, setWholesalePrice] = useState("");
  const [retailPrice, setRetailPrice] = useState("");
  const [cameraPermission, setCameraPermission] = useState(null);
  const [photoMode, setPhotoMode] = useState(false);
  const [camera, setCamera] = useState(null);

  // Form states for filaments
  const [type, setType] = useState("");
  const [color, setColor] = useState("");
  const [filamentStock, setFilamentStock] = useState("");
  const [supplier, setSupplier] = useState(""); // Cargar datos al inicio
  useFocusEffect(
    React.useCallback(() => {
      fetchPieces();
      fetchFilaments();
    }, [])
  );

  // Filtrar items basados en la búsqueda
  useEffect(() => {
    const currentItems = activeTab === "pieces" ? pieces : filaments;

    if (searchQuery.trim() === "") {
      setFilteredItems(currentItems);
    } else {
      let filtered = [];

      if (activeTab === "pieces") {
        filtered = pieces.filter(
          (piece) =>
            piece.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (piece.description &&
              piece.description
                .toLowerCase()
                .includes(searchQuery.toLowerCase()))
        );
      } else {
        filtered = filaments.filter(
          (filament) =>
            filament.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
            filament.color.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (filament.supplier &&
              filament.supplier
                .toLowerCase()
                .includes(searchQuery.toLowerCase()))
        );
      }

      setFilteredItems(filtered);
    }
  }, [searchQuery, activeTab, pieces, filaments]);

  const toggleSearch = () => {
    setShowSearch(!showSearch);
    if (showSearch) {
      setSearchQuery("");
    }
  };

  const formatPrice = (price) => {
    return price.toLocaleString("es-AR", {
      style: "currency",
      currency: "ARS",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
  };

  const openAddModal = () => {
    resetForm();
    setIsEditing(false);
    setModalVisible(true);
  };
  const formatPriceInput = (value) => {
    return value.toLocaleString("es-AR", {
      style: "currency",
      currency: "ARS",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
  };
  const openEditModal = (item) => {
    setCurrentItem(item);
    setIsEditing(true);

    if (activeTab === "pieces") {
      setName(item.name || "");
      setDescription(item.description || "");
      setImageUrl(item.image_url || "");
      setStock(String(item.stock || ""));
      setWholesalePrice(String(item.wholesale_price || ""));
      setRetailPrice(String(item.retail_price || ""));
    } else {
      setType(item.type || "");
      setColor(item.color || "");
      setFilamentStock(String(item.stock || ""));
      setSupplier(item.supplier || "");
    }

    setModalVisible(true);
  }; // Solicitar permisos de cámara
  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setCameraPermission(status === "granted");
    })();
  }, []);

  const resetForm = () => {
    setName("");
    setDescription("");
    setImageUrl("");
    setImageBase64("");
    setStock("");
    setWholesalePrice("");
    setRetailPrice("");
    setType("");
    setColor("");
    setFilamentStock("");
    setSupplier("");
    setCurrentItem(null);
    setPhotoMode(false);
  };

  // Tomar foto con la cámara
  const takePicture = async () => {
    if (camera && cameraPermission) {
      try {
        const photo = await camera.takePictureAsync({
          quality: 0.7,
          base64: true,
        });
        setImageBase64(photo.base64);
        setImageUrl(`data:image/jpeg;base64,${photo.base64}`);
        setPhotoMode(false);
      } catch (error) {
        console.error("Error al tomar la foto:", error);
        toast.error("No se pudo tomar la foto");
      }
    }
  }; // Seleccionar imagen de la galería
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
        // Usar directamente la URI de la imagen para mostrarla
        setImageUrl(asset.uri);

        // También guardamos la versión base64 para subir a Cloudinary posteriormente
        if (asset.base64) {
          setImageBase64(asset.base64);
        }

        toast.success("Imagen seleccionada correctamente");
      }
    } catch (error) {
      console.error("Error al seleccionar la imagen:", error);
      toast.error("No se pudo seleccionar la imagen");
    }
  };

  const handleSubmit = async () => {
    try {
      if (activeTab === "pieces") {
        // Validaciones para pieza
        if (!name.trim()) {
          toast.error("El nombre es obligatorio");
          return;
        }

        if (isNaN(Number(stock)) || Number(stock) < 0) {
          toast.error("El stock debe ser un número positivo");
          return;
        }

        if (isNaN(Number(wholesalePrice)) || Number(wholesalePrice) <= 0) {
          toast.error("El precio al por mayor debe ser un número positivo");
          return;
        }

        if (isNaN(Number(retailPrice)) || Number(retailPrice) <= 0) {
          toast.error("El precio al por menor debe ser un número positivo");
          return;
        }
        let finalImageUrl = imageUrl;

        // Si tenemos una imagen en base64, intentar subirla a Cloudinary
        if (imageBase64) {
          try {
            finalImageUrl = await uploadToCloudinary(
              `data:image/jpeg;base64,${imageBase64}`
            );
          } catch (uploadError) {
            console.error("Error uploading to Cloudinary:", uploadError);
            // Si falla Cloudinary, usar la API de imágenes como respaldo
            toast.error(
              "Error al subir imagen a Cloudinary, usando imagen generada"
            );
            finalImageUrl = getApiImageUrl(`3D printed ${name}`);
          }
        }
        // Si no hay imagen seleccionada, usar la API para generar una imagen
        else if (!imageUrl) {
          finalImageUrl = getApiImageUrl(`3D printed ${name}`);
        }

        const pieceData = {
          name,
          description,
          image_url: finalImageUrl,
          stock: Number(stock),
          wholesale_price: Number(wholesalePrice),
          retail_price: Number(retailPrice),
        };

        if (isEditing && currentItem) {
          await updatePiece(currentItem.id, pieceData);
        } else {
          await addPiece(pieceData);
        }
      } else {
        // Validaciones para filamento
        if (!type.trim()) {
          toast.error("El tipo es obligatorio");
          return;
        }

        if (!color.trim()) {
          toast.error("El color es obligatorio");
          return;
        }

        if (isNaN(Number(filamentStock)) || Number(filamentStock) < 0) {
          toast.error("El stock debe ser un número positivo");
          return;
        }

        const filamentData = {
          type,
          color,
          stock: Number(filamentStock),
          supplier,
        };

        if (isEditing && currentItem) {
          await updateFilament(currentItem.id, filamentData);
        } else {
          await addFilament(filamentData);
        }
      }

      // Cerrar modal y resetear formulario
      setModalVisible(false);
      resetForm();
    } catch (error) {
      console.error("Error al guardar:", error);
      toast.error("Error al guardar los datos");
    }
  };

  const handleDelete = (id) => {
    Alert.alert(
      "Confirmar eliminación",
      "¿Estás seguro de que deseas eliminar este elemento? Esta acción no se puede deshacer.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            try {
              if (activeTab === "pieces") {
                await deletePiece(id);
              } else {
                await deleteFilament(id);
              }
            } catch (error) {
              console.error("Error al eliminar:", error);
              toast.error("Error al eliminar el elemento");
            }
          },
        },
      ]
    );
  };

  const renderPieceItem = ({ item }) => (
    <TouchableOpacity
      style={styles.itemCard}
      onPress={() => openEditModal(item)}
    >
      <Image
        source={{
          uri:
            item.image_url ||
            `https://api.a0.dev/assets/image?text=3D printed ${item.name}&aspect=1:1`,
        }}
        style={styles.itemImage}
      />
      <View style={styles.itemContent}>
        <Text style={styles.itemName}>{item.name}</Text>
        <Text style={styles.itemDescription} numberOfLines={1}>
          {item.description}
        </Text>
        <View style={styles.itemFooter}>
          <View style={styles.stockContainer}>
            <Text
              style={[
                styles.stockText,
                item.stock < 15 ? styles.lowStock : null,
              ]}
            >
              Stock: {item.stock}
            </Text>
          </View>
          <Text style={styles.priceText}>{formatPrice(item.retail_price)}</Text>
        </View>
      </View>
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => openEditModal(item)}
        >
          <MaterialIcons name="edit" size={22} color="#666" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => handleDelete(item.id)}
        >
          <MaterialIcons name="delete" size={22} color="#F44336" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
  const renderFilamentItem = ({ item }) => (
    <TouchableOpacity
      style={styles.itemCard}
      onPress={() => openEditModal(item)}
    >
      <View
        style={[
          styles.colorSwatch,
          { backgroundColor: getColorHex(item.color) },
        ]}
      />
      <View style={styles.itemContent}>
        <Text style={styles.itemName}>
          {item.type} - {item.color}
        </Text>
        <Text style={styles.itemDescription}>Proveedor: {item.supplier}</Text>
        <View style={styles.itemFooter}>
          <View style={styles.stockContainer}>
            <Text
              style={[
                styles.stockText,
                item.stock < 500 ? styles.lowStock : null,
              ]}
            >
              Stock: {item.stock}g
            </Text>
          </View>
        </View>
      </View>
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => openEditModal(item)}
        >
          <MaterialIcons name="edit" size={22} color="#666" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => handleDelete(item.id)}
        >
          <MaterialIcons name="delete" size={22} color="#F44336" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  // Helper function to get color hex based on name
  const getColorHex = (colorName) => {
    const colors = {
      Blanco: "#F5F5F5",
      Negro: "#333333",
      Rojo: "#F44336",
      Azul: "#2196F3",
      Verde: "#4CAF50",
      Amarillo: "#FFEB3B",
      Naranja: "#FF9800",
      Morado: "#9C27B0",
    };
    return colors[colorName] || "#CCCCCC";
  };
  if (loading && pieces.length === 0 && filaments.length === 0) {
    return (
      <SafeAreaView style={[styles.container, styles.loadingContainer]}>
        <View style={styles.header}>
          {!showSearch ? (
            <>
              <Text style={styles.headerTitle}>Inventario</Text>
              <TouchableOpacity onPress={toggleSearch}>
                <Ionicons name="search" size={24} color="#333" />
              </TouchableOpacity>
            </>
          ) : (
            <View style={styles.searchContainer}>
              <TextInput
                style={styles.searchInput}
                placeholder={`Buscar ${
                  activeTab === "pieces" ? "pieza" : "filamento"
                }...`}
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoFocus
              />
              <TouchableOpacity
                onPress={toggleSearch}
                style={styles.searchCloseButton}
              >
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
          )}
        </View>
        <ActivityIndicator size="large" color="#6C63FF" />
        <Text style={styles.loadingText}>Cargando inventario...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        {!showSearch ? (
          <>
            <Text style={styles.headerTitle}>Inventario</Text>
            <TouchableOpacity onPress={toggleSearch}>
              <Ionicons name="search" size={24} color="#333" />
            </TouchableOpacity>
          </>
        ) : (
          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder={`Buscar ${
                activeTab === "pieces" ? "pieza" : "filamento"
              }...`}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus
            />
            <TouchableOpacity
              onPress={toggleSearch}
              style={styles.searchCloseButton}
            >
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>
        )}
      </View>
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "pieces" && styles.activeTab]}
          onPress={() => setActiveTab("pieces")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "pieces" && styles.activeTabText,
            ]}
          >
            Piezas
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === "filaments" && styles.activeTab]}
          onPress={() => setActiveTab("filaments")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "filaments" && styles.activeTabText,
            ]}
          >
            Filamentos
          </Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={
          searchQuery.trim() !== ""
            ? filteredItems
            : activeTab === "pieces"
            ? pieces
            : filaments
        }
        renderItem={
          activeTab === "pieces" ? renderPieceItem : renderFilamentItem
        }
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <Image
              source={require("../assets/notFound.png")} // Asegúrate de tener esta imagen en tu proyecto
              style={styles.emptyImage}
            />
            <Text style={styles.emptyText}>
              No hay {activeTab === "pieces" ? "piezas" : "filamentos"}{" "}
              disponibles
            </Text>
            <TouchableOpacity
              style={styles.addEmptyButton}
              onPress={openAddModal}
            >
              <Text style={styles.addEmptyButtonText}>
                Añadir {activeTab === "pieces" ? "pieza" : "filamento"}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      />
      <TouchableOpacity style={styles.fab} onPress={openAddModal}>
        <Ionicons name="add" size={24} color="white" />
      </TouchableOpacity>
      {/* Modal para cámara */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={photoMode}
        onRequestClose={() => setPhotoMode(false)}
      >
        <View style={styles.cameraModalContainer}>
          {cameraPermission ? (
            <CameraView style={styles.camera} ref={(ref) => setCamera(ref)}>
              <View style={styles.cameraButtonsContainer}>
                <TouchableOpacity
                  style={styles.cameraCancelButton}
                  onPress={() => setPhotoMode(false)}
                >
                  <Ionicons name="close" size={28} color="white" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.cameraTakeButton}
                  onPress={takePicture}
                >
                  <View style={styles.cameraTakeButtonInner} />
                </TouchableOpacity>
              </View>
            </CameraView>
          ) : (
            <View style={styles.cameraPermissionContainer}>
              <Text style={styles.cameraPermissionText}>
                Se necesita permiso para acceder a la cámara
              </Text>
              <TouchableOpacity
                style={styles.cameraPermissionButton}
                onPress={() => setPhotoMode(false)}
              >
                <Text style={styles.cameraPermissionButtonText}>Entendido</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </Modal>
      {/* Modal para añadir/editar */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {isEditing ? "Editar" : "Añadir"}{" "}
                {activeTab === "pieces" ? "Pieza" : "Filamento"}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            {activeTab === "pieces" ? (
              <View style={styles.formContainer}>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Nombre:</Text>
                  <TextInput
                    style={styles.input}
                    value={name}
                    onChangeText={setName}
                    placeholder="Nombre de la pieza"
                  />
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Descripción:</Text>
                  <TextInput
                    style={styles.input}
                    value={description}
                    onChangeText={setDescription}
                    placeholder="Descripción de la pieza"
                    multiline
                  />
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Imagen:</Text>
                  {imageUrl ? (
                    <View style={styles.imagePreviewContainer}>
                      <Image
                        source={{ uri: imageUrl }}
                        style={styles.imagePreview}
                        resizeMode="cover"
                      />
                      <TouchableOpacity
                        style={styles.removeImageButton}
                        onPress={() => {
                          setImageUrl("");
                          setImageBase64("");
                          toast.info("Imagen eliminada");
                        }}
                      >
                        <Ionicons
                          name="close-circle"
                          size={28}
                          color="#F44336"
                        />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={styles.imagePickerButton}
                      onPress={pickImage}
                    >
                      <Ionicons
                        name="image-outline"
                        size={38}
                        color="#6C63FF"
                      />
                      <Text style={styles.imagePickerText}>
                        Seleccionar imagen
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
                <View style={styles.inputRow}>
                  <View
                    style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}
                  >
                    <Text style={styles.label}>Stock:</Text>
                    <TextInput
                      style={styles.input}
                      value={stock}
                      onChangeText={setStock}
                      placeholder="0"
                      keyboardType="numeric"
                    />
                  </View>

                  <View style={[styles.inputGroup, { flex: 1 }]}>
                    <Text style={styles.label}>Precio Mayorista:</Text>
                    <TextInput
                      style={styles.input}
                      value={wholesalePrice}
                      onChangeText={setWholesalePrice}
                      placeholder="0.00"
                      keyboardType="numeric"
                    />
                  </View>
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Precio Venta:</Text>
                  <TextInput
                    style={styles.input}
                    value={retailPrice}
                    onChangeText={setRetailPrice}
                    placeholder="0.00"
                    keyboardType="numeric"
                  />
                </View>
              </View>
            ) : (
              <View style={styles.formContainer}>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Tipo:</Text>
                  <TextInput
                    style={styles.input}
                    value={type}
                    onChangeText={setType}
                    placeholder="PLA, ABS, PETG, etc."
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Color:</Text>
                  <TextInput
                    style={styles.input}
                    value={color}
                    onChangeText={setColor}
                    placeholder="Rojo, Azul, Negro, etc."
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Stock (g):</Text>
                  <TextInput
                    style={styles.input}
                    value={filamentStock}
                    onChangeText={setFilamentStock}
                    placeholder="0"
                    keyboardType="numeric"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Proveedor:</Text>
                  <TextInput
                    style={styles.input}
                    value={supplier}
                    onChangeText={setSupplier}
                    placeholder="Nombre del proveedor"
                  />
                </View>
              </View>
            )}

            <View style={styles.modalButtonContainer}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleSubmit}
              >
                <Text style={styles.saveButtonText}>
                  {isEditing ? "Actualizar" : "Añadir"}
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
    backgroundColor: "#F7F8FC",
    paddingBottom: 20,
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
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
  },
  searchContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
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
  tabContainer: {
    flexDirection: "row",
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  tab: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: "#F0F0F0",
  },
  activeTab: {
    backgroundColor: "#6C63FF",
  },
  tabText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#666",
  },
  activeTabText: {
    color: "white",
  },
  listContainer: {
    paddingHorizontal: 24,
    paddingBottom: 80,
  },
  itemCard: {
    flexDirection: "row",
    backgroundColor: "white",
    borderRadius: 12,
    marginBottom: 12,
    paddingLeft: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    alignItems: "center",
    overflow: "hidden",
  },
  itemImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  colorSwatch: {
    width: 80,
    height: 80,
    borderRightWidth: 1,
    borderColor: "#F0F0F0",
  },
  itemContent: {
    flex: 1,
    padding: 12,
  },
  itemName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  itemDescription: {
    fontSize: 14,
    color: "#666",
    marginBottom: 8,
  },
  imagePreview: {
    width: "100%",
    height: 200,
    borderRadius: 8,
    marginBottom: 10,
  },
  itemFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  stockContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  stockText: {
    fontSize: 14,
    color: "#4CAF50",
    fontWeight: "500",
  },
  lowStock: {
    color: "#FF5722",
  },
  priceText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
  },
  buttonContainer: {
    flexDirection: "column",
    justifyContent: "space-between",
    padding: 8,
  },
  editButton: {
    padding: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  deleteButton: {
    marginTop: 8,
    padding: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  fab: {
    position: "absolute",
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#6C63FF",
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
    backgroundColor: "white",
    borderRadius: 12,
    marginVertical: 20,
    flex: 1,
  },
  emptyText: {
    fontSize: 16,
    color: "#666",
    marginBottom: 16,
    textAlign: "center",
  },
  addEmptyButton: {
    backgroundColor: "#6C63FF",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  addEmptyButtonText: {
    color: "white",
    fontWeight: "500",
  },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContent: {
    width: "90%",
    backgroundColor: "white",
    borderRadius: 12,
    padding: 20,
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
  formContainer: {
    marginBottom: 40,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  label: {
    fontSize: 14,
    color: "#666",
    marginBottom: 6,
  },
  input: {
    backgroundColor: "#F7F8FC",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    fontSize: 16,
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
