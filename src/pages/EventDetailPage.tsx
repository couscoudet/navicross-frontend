import React, { useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import maplibregl from "maplibre-gl";
import { Map } from "@/components/map/Map";
import { Button } from "@/components/ui/Button";
import { AddressSearch } from "@/components/AddressSearch";
import { ArrowLeft, MapPin, Route, Map as MapIcon, X } from "lucide-react";
import { useClosures } from "@/hooks/useClosures";
import { api } from "@/services/api";
import { ClosureForm } from "@/components/closures/ClosureForm";
import { Modal } from "@/components/ui/Modal";
import type {
  Event,
  Closure,
  CreateClosureDto,
  UpdateClosureDto,
} from "@/types";

export const EventDetailPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  const [selectedType, setSelectedType] = useState<
    "barrier" | "segment" | "zone" | undefined
  >();
  const [drawingGeometry, setDrawingGeometry] =
    useState<GeoJSON.Geometry | null>(null);
  const [editingClosure, setEditingClosure] = useState<Closure | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showPanel, setShowPanel] = useState(false);
  const mapInstanceRef = useRef<maplibregl.Map | null>(null);

  const { data: event } = useQuery<Event>({
    queryKey: ["event", slug],
    queryFn: () => api.events.getBySlug(slug!),
    enabled: !!slug,
  });

  const {
    closures,
    createClosure,
    updateClosure,
    deleteClosure,
    isCreating,
    isUpdating,
  } = useClosures(slug!);

  const handleMapReady = (mapInstance: maplibregl.Map) => {
    mapInstanceRef.current = mapInstance;
  };

  const handleSelectAddress = (lat: number, lng: number, label: string) => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo({
        center: [lng, lat],
        zoom: 17,
        duration: 1500,
      });
    }
  };

  const handleDrawCreate = (
    geometry: GeoJSON.Geometry,
    type: "barrier" | "segment" | "zone"
  ) => {
    setDrawingGeometry(geometry);
    setEditingClosure(null);
    setShowModal(true);
    setShowPanel(false);
  };

  const handleStartDrawing = (type: "barrier" | "segment" | "zone") => {
    setSelectedType(type);
    setEditingClosure(null);
    setDrawingGeometry(null);
  };

  const handleClosureClick = (closure: Closure) => {
    setEditingClosure(closure);
    setDrawingGeometry(closure.polygon);
    setSelectedType(closure.type);
    setShowModal(true);
    setShowPanel(false);
  };

  const handleCancel = () => {
    setSelectedType(undefined);
    setDrawingGeometry(null);
    setShowModal(false);
    setEditingClosure(null);
  };

  const handleSubmit = async (data: CreateClosureDto | UpdateClosureDto) => {
    try {
      if (editingClosure) {
        await updateClosure({
          id: editingClosure.id,
          data: data as UpdateClosureDto,
        });
      } else {
        await createClosure(data as CreateClosureDto);
      }
      handleCancel();
    } catch (error) {
      throw error;
    }
  };

  const handleDelete = async (closure: Closure) => {
    if (window.confirm(`Supprimer "${closure.name}" ?`)) {
      try {
        await deleteClosure(closure.id);
      } catch (error) {
        console.error("Delete error:", error);
      }
    }
  };

  if (!event) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-5 py-3 flex items-center justify-between z-10">
        <div className="flex items-center gap-4">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => navigate("/admin")}
          >
            <ArrowLeft size={16} />
          </Button>
          <div>
            <h1 className="text-lg font-semibold text-gray-900">
              {event.name}
            </h1>
            <p className="text-xs text-gray-500">
              {new Date(event.event_date).toLocaleDateString("fr-FR", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-red-50 rounded-lg">
          <div className="w-9 h-9 bg-red-100 rounded-full flex items-center justify-center">
            <X size={18} className="text-red-600" />
          </div>
          <div>
            <div className="text-lg font-semibold text-gray-900">
              {closures.length}
            </div>
            <div className="text-xs text-gray-500">Closures</div>
          </div>
        </div>
      </header>

      <div className="flex-1 relative">
        <div className="absolute inset-0">
          <Map
            closures={closures}
            onDrawCreate={handleDrawCreate}
            onClosureClick={handleClosureClick}
            onMapReady={handleMapReady}
            selectedType={selectedType}
          />
        </div>

        {showPanel && (
          <div className="absolute top-5 left-5 w-96 bg-white rounded-2xl shadow-2xl">
            <div className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-gray-900">
                  Ajouter une closure
                </h2>
                <button
                  onClick={() => setShowPanel(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100"
                >
                  <X size={16} />
                </button>
              </div>

              <AddressSearch onSelectAddress={handleSelectAddress} />

              <div className="grid grid-cols-3 gap-2 mb-4">
                <button
                  onClick={() => handleStartDrawing("barrier")}
                  className={`p-3 flex flex-col items-center gap-2 border rounded-lg text-xs font-medium transition-all ${
                    selectedType === "barrier"
                      ? "bg-orange-50 border-orange-500 text-orange-700"
                      : "border-gray-200 text-gray-600 hover:border-orange-500"
                  }`}
                >
                  <MapPin size={20} />
                  <span>Barrage</span>
                </button>
                <button
                  onClick={() => handleStartDrawing("segment")}
                  className={`p-3 flex flex-col items-center gap-2 border rounded-lg text-xs font-medium transition-all ${
                    selectedType === "segment"
                      ? "bg-purple-50 border-purple-500 text-purple-700"
                      : "border-gray-200 text-gray-600 hover:border-purple-500"
                  }`}
                >
                  <Route size={20} />
                  <span>Tronçon</span>
                </button>
                <button
                  onClick={() => handleStartDrawing("zone")}
                  className={`p-3 flex flex-col items-center gap-2 border rounded-lg text-xs font-medium transition-all ${
                    selectedType === "zone"
                      ? "bg-red-50 border-red-500 text-red-700"
                      : "border-gray-200 text-gray-600 hover:border-red-500"
                  }`}
                >
                  <MapIcon size={20} />
                  <span>Zone</span>
                </button>
              </div>

              <div className="text-xs text-gray-500 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-1 bg-gray-100 rounded font-medium">
                    1
                  </span>
                  <span>Cherche une adresse pour centrer la carte</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-1 bg-gray-100 rounded font-medium">
                    2
                  </span>
                  <span>Sélectionne un type et dessine</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-1 bg-gray-100 rounded font-medium">
                    3
                  </span>
                  <span>Clique une closure pour éditer</span>
                </div>
              </div>
            </div>

            {closures.length > 0 && (
              <div className="border-t border-gray-200 p-5 max-h-96 overflow-y-auto">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">
                  Closures ({closures.length})
                </h3>
                <div className="space-y-2">
                  {closures.map((closure) => (
                    <div
                      key={closure.id}
                      onClick={() => handleClosureClick(closure)}
                      className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm text-gray-900 truncate">
                            {closure.name}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {new Date(closure.start_time).toLocaleTimeString(
                              "fr-FR",
                              {
                                hour: "2-digit",
                                minute: "2-digit",
                              }
                            )}{" "}
                            →{" "}
                            {new Date(closure.end_time).toLocaleTimeString(
                              "fr-FR",
                              {
                                hour: "2-digit",
                                minute: "2-digit",
                              }
                            )}
                          </div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(closure);
                          }}
                          className="px-2 py-1 text-xs text-red-600 bg-white border border-red-200 rounded hover:bg-red-50"
                        >
                          Suppr.
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {!showPanel && (
          <button
            onClick={() => setShowPanel(true)}
            className="absolute top-5 left-5 bg-primary text-white px-5 py-3 rounded-full shadow-xl hover:bg-blue-700 transition-all flex items-center gap-2 font-medium"
          >
            <MapPin size={18} />
            <span>Gérer closures</span>
          </button>
        )}

        <div className="absolute bottom-5 left-5 bg-white rounded-xl shadow-lg p-4">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
            Légende
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="w-5 h-3 bg-orange-400 bg-opacity-50 border-2 border-orange-600 rounded"></div>
              <span className="text-xs text-gray-600">Barrage</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-5 h-3 bg-purple-400 bg-opacity-50 border-2 border-purple-600 rounded"></div>
              <span className="text-xs text-gray-600">Tronçon</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-5 h-3 bg-red-400 bg-opacity-40 border-2 border-red-600 rounded"></div>
              <span className="text-xs text-gray-600">Zone</span>
            </div>
          </div>
        </div>
      </div>

      <Modal
        isOpen={showModal && !!drawingGeometry}
        onClose={handleCancel}
        title={
          editingClosure ? `Éditer ${editingClosure.name}` : "Créer une closure"
        }
      >
        {drawingGeometry && selectedType && (
          <ClosureForm
            geometry={drawingGeometry}
            type={selectedType}
            initialData={editingClosure || undefined}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            isLoading={isCreating || isUpdating}
            eventDate={event.event_date}
            existingCount={closures.length}
          />
        )}
      </Modal>
    </div>
  );
};
