import React, { useState, useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import maplibregl from "maplibre-gl";
import { Map } from "@/components/map/Map";
import { Button } from "@/components/ui/Button";
import { AddressSearch } from "@/components/AddressSearch";
import {
  ArrowLeft,
  MapPin,
  Route,
  Map as MapIcon,
  X,
  FileSpreadsheet,
} from "lucide-react";
import { useClosures } from "@/hooks/useClosures";
import { api } from "@/services/api";
import { ClosureForm } from "@/components/closures/ClosureForm";
import { Modal } from "@/components/ui/Modal";
import { useTutorial } from "@/contexts/TutorialContext";
import { eventDetailTutorialSteps } from "@/config/tutorials";
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
  const [uploadingGpx, setUploadingGpx] = useState(false);
  const mapInstanceRef = useRef<maplibregl.Map | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // Tutorial
  const { autoStartTutorial } = useTutorial();

  // Écouter l'événement de fermeture des modales
  useEffect(() => {
    const handleCloseModals = () => {
      setShowModal(false);
      setShowPanel(false);
      setEditingClosure(null);
      setSelectedType(undefined);
    };

    window.addEventListener("close-modals", handleCloseModals);
    return () => window.removeEventListener("close-modals", handleCloseModals);
  }, []);

  // Auto-démarrer le tutoriel à la première visite
  useEffect(() => {
    if (event) {
      // Ajouter les actions automatiques aux étapes du tutoriel
      const stepsWithActions = eventDetailTutorialSteps.map((step, index) => {
        // Première étape : fermer toutes les modales
        if (index === 0) {
          return {
            ...step,
            action: () => {
              setShowModal(false);
              setShowPanel(false);
              setEditingClosure(null);
              setSelectedType(undefined);
            },
          };
        }

        // Ouvrir automatiquement le panneau pour les étapes qui en ont besoin
        if (
          step.id === "event-closures-btn" ||
          step.id === "event-barrier" ||
          step.id === "event-segment" ||
          step.id === "event-zone" ||
          step.id === "event-closures-list"
        ) {
          return {
            ...step,
            action: () => {
              setShowPanel(true);
            },
          };
        }
        return step;
      });

      autoStartTutorial("event-detail", stepsWithActions);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event]);

  const handleMapReady = (mapInstance: maplibregl.Map) => {
    mapInstanceRef.current = mapInstance;
  };

  const handleSelectAddress = (lat: number, lng: number) => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo({
        center: [lng, lat],
        zoom: 17,
        duration: 1500,
      });
    }
  };

  const handleDrawCreate = (geometry: GeoJSON.Geometry) => {
    setDrawingGeometry(geometry);
    setEditingClosure(null);
    setShowModal(true);
    setShowPanel(false);
  };

  const handleStartDrawing = (type: "barrier" | "segment" | "zone") => {
    setSelectedType(type);
    setEditingClosure(null);
    setDrawingGeometry(null);
    // Auto-collapse le panneau après sélection du type
    setShowPanel(false);
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

  const handleGpxUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".gpx")) {
      alert("Seuls les fichiers .gpx sont acceptés");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setUploadingGpx(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/events/${slug}/closures/upload-gpx`,
        {
          method: "POST",
          body: formData,
          credentials: "include",
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Import failed");
      }

      const result = await response.json();

      if (result.errors && result.errors.length > 0) {
        alert(
          `✓ ${result.created} closure(s) créée(s)\n⚠️ ${result.errors.length} erreur(s)`
        );
      } else {
        alert(`✓ ${result.created} closure(s) importée(s)`);
      }

      window.location.reload();
    } catch (error) {
      console.error("GPX upload error:", error);
      alert(
        error instanceof Error ? error.message : "Erreur lors de l'import GPX"
      );
    } finally {
      setUploadingGpx(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  if (!event) {
    return (
      <div className="h-[100dvh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="h-[100dvh] flex flex-col bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 py-2 flex items-center justify-between z-10 flex-shrink-0">
        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => navigate("/admin")}
          >
            <ArrowLeft size={16} />
          </Button>
          <div>
            <h1 className="text-base font-semibold text-gray-900">
              {event.name}
            </h1>
            <p className="text-xs text-gray-500">
              {new Date(event.event_date).toLocaleDateString("fr-FR", {
                day: "numeric",
                month: "short",
              })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-red-50 rounded-lg">
          <div className="w-7 h-7 bg-red-100 rounded-full flex items-center justify-center">
            <X size={14} className="text-red-600" />
          </div>
          <div>
            <div className="text-base font-semibold text-gray-900">
              {closures.length}
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 relative overflow-hidden">
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
          <div className="absolute inset-x-0 top-0 md:inset-x-4 md:top-4 md:bottom-auto bg-white md:rounded-2xl shadow-2xl max-h-[40vh] md:max-h-[70vh] overflow-hidden flex flex-col animate-slide-up">
            {/* Handle bar pour mobile */}

            <div className="p-3 flex-shrink-0">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-gray-900">
                  Fermetures ({closures.length})
                </h2>
                <button
                  onClick={() => setShowPanel(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 active:bg-gray-200 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="mb-3">
                <AddressSearch onSelectAddress={handleSelectAddress} />
              </div>

              <div className="grid grid-cols-4 gap-2">
                <button
                  onClick={() => handleStartDrawing("barrier")}
                  data-tutorial="barrier-btn"
                  className={`p-1 flex flex-col items-center gap-1 border rounded-xl text-xs font-medium transition-all active:scale-95 ${
                    selectedType === "barrier"
                      ? "bg-orange-50 border-orange-500 shadow-sm"
                      : "border-gray-200 hover:border-orange-300"
                  }`}
                >
                  <MapPin
                    size={20}
                    className={
                      selectedType === "barrier"
                        ? "text-orange-600"
                        : "text-gray-600"
                    }
                  />
                  <span className="text-[10px]">Barrage</span>
                </button>
                <button
                  onClick={() => handleStartDrawing("segment")}
                  data-tutorial="segment-btn"
                  className={`p-1 flex flex-col items-center gap-1  border rounded-xl text-xs font-medium transition-all active:scale-95 ${
                    selectedType === "segment"
                      ? "bg-purple-50 border-purple-500 shadow-sm"
                      : "border-gray-200 hover:border-purple-300"
                  }`}
                >
                  <Route
                    size={20}
                    className={
                      selectedType === "segment"
                        ? "text-purple-600"
                        : "text-gray-600"
                    }
                  />
                  <span className="text-[10px]">Tronçon</span>
                </button>
                <button
                  onClick={() => handleStartDrawing("zone")}
                  data-tutorial="zone-btn"
                  className={`p-1 flex flex-col items-center gap-1  border rounded-xl text-xs font-medium transition-all active:scale-95 ${
                    selectedType === "zone"
                      ? "bg-red-50 border-red-500 shadow-sm"
                      : "border-gray-200 hover:border-red-300"
                  }`}
                >
                  <MapIcon
                    size={20}
                    className={
                      selectedType === "zone" ? "text-red-600" : "text-gray-600"
                    }
                  />
                  <span className="text-[10px]">Zone</span>
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingGpx}
                  className="p-1 flex flex-col items-center gap-1 border border-gray-200 rounded-xl text-xs font-medium hover:border-primary transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <FileSpreadsheet size={20} className="text-gray-600" />
                  <span className="text-[10px]">
                    {uploadingGpx ? "..." : "GPX"}
                  </span>
                </button>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".gpx"
                onChange={handleGpxUpload}
                className="hidden"
              />
            </div>

            {closures.length > 0 && (
              <div
                className="border-t border-gray-200 px-4 pb-4 pt-3 overflow-y-auto flex-1 h-32"
                data-tutorial="closures-list"
              >
                <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
                  Liste ({closures.length})
                </div>
                <div className="space-y-2">
                  {closures.map((closure) => (
                    <div
                      key={closure.id}
                      onClick={() => handleClosureClick(closure)}
                      className="p-3 bg-gray-50 rounded-xl hover:bg-gray-100 active:bg-gray-200 transition-colors cursor-pointer"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm text-gray-900 truncate mb-0.5">
                            {closure.name}
                          </div>
                          <div className="text-xs text-gray-500">
                            {new Date(closure.start_time).toLocaleTimeString(
                              "fr-FR",
                              { hour: "2-digit", minute: "2-digit" }
                            )}
                            {" → "}
                            {new Date(closure.end_time).toLocaleTimeString(
                              "fr-FR",
                              { hour: "2-digit", minute: "2-digit" }
                            )}
                          </div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(closure);
                          }}
                          className="px-2.5 py-1.5 text-xs text-red-600 bg-white border border-red-200 rounded-lg hover:bg-red-50 active:bg-red-100 transition-colors flex-shrink-0"
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
          <div className="absolute top-4 left-4 flex flex-col gap-2">
            <button
              onClick={() => setShowPanel(true)}
              data-tutorial="closures-btn"
              className={`text-white px-4 py-2.5 rounded-full shadow-xl active:scale-95 transition-all flex items-center gap-2 text-sm font-medium ${
                selectedType
                  ? selectedType === "barrier"
                    ? "bg-orange-500"
                    : selectedType === "segment"
                    ? "bg-purple-500"
                    : "bg-red-500"
                  : "bg-primary"
              }`}
            >
              {selectedType ? (
                selectedType === "barrier" ? (
                  <MapPin size={16} />
                ) : selectedType === "segment" ? (
                  <Route size={16} />
                ) : (
                  <MapIcon size={16} />
                )
              ) : (
                <MapPin size={16} />
              )}
              <span>
                {selectedType
                  ? selectedType === "barrier"
                    ? "Mode Barrage"
                    : selectedType === "segment"
                    ? "Mode Tronçon"
                    : "Mode Zone"
                  : "Fermetures"}
              </span>
              {selectedType && (
                <span className="bg-white bg-opacity-30 px-1.5 py-0.5 rounded text-xs">
                  Dessiner
                </span>
              )}
            </button>
            {selectedType && (
              <button
                onClick={handleCancel}
                className="bg-white text-gray-700 px-3 py-2 rounded-full shadow-lg active:scale-95 transition-all flex items-center gap-1.5 text-xs font-medium border border-gray-200"
              >
                <X size={14} />
                <span>Annuler</span>
              </button>
            )}
          </div>
        )}

        <div className="absolute bottom-4 left-4 bg-white rounded-xl shadow-lg p-3">
          <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
            Légende
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <div className="w-4 h-2 bg-orange-400 bg-opacity-50 border-2 border-orange-600 rounded"></div>
              <span className="text-xs text-gray-600">Barrage</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-2 bg-purple-400 bg-opacity-50 border-2 border-purple-600 rounded"></div>
              <span className="text-xs text-gray-600">Tronçon</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-2 bg-red-400 bg-opacity-40 border-2 border-red-600 rounded"></div>
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
