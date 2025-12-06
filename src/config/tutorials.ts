import { TutorialStep } from "@/contexts/TutorialContext";

export const homeTutorialSteps: TutorialStep[] = [
  {
    id: "home-welcome",
    target: "body",
    title: "Bienvenue sur Navicross !",
    content:
      "Navicross vous permet de rechercher des itinéraires tout en tenant compte des fermetures de routes lors d'événements sportifs.\n\nCe tutoriel va vous guider à travers les fonctionnalités principales.",
    placement: "bottom",
  },
  {
    id: "home-events",
    target: "[data-tutorial='events-list']",
    title: "Liste des événements",
    content:
      "Par défaut nous affichons les évènements publiés pour les 10 prochains jours.\n\nFaites une recherche parmi tous les évènements\n\nCliquez ensuite sur un événement pour accéder à la recherche d'itinéraire qui prend en compte les fermetures de routes.",
    placement: "right",
  },
  {
    id: "home-admin",
    target: "[data-tutorial='admin-access']",
    title: "Accès administration",
    content:
      "Connectez-vous/Inscrivez-vous ici pour créer vos événements et ajouter les fermetures de routes ou encore des trajets GPX.",
    placement: "bottom",
  },
];

export const adminTutorialSteps: TutorialStep[] = [
  {
    id: "admin-welcome",
    target: "body",
    title: "Espace administration",
    content:
      "Bienvenue dans l'espace administration !\n\nIci, vous pouvez créer vos événements et définir les fermetures de routes associées.",
    placement: "bottom",
  },
  {
    id: "admin-create-event",
    target: "[data-tutorial='create-event-btn']",
    title: "Créer un événement",
    content:
      "Cliquez ici pour créer un nouvel événement.\n\nVous devrez renseigner le nom, la date et éventuellement le parcours de l'événement.",
    placement: "bottom",
  },
  {
    id: "admin-event-list",
    target: "[data-tutorial='events-list']",
    title: "Vos événements",
    content:
      "Tous vos événements créés apparaissent ici.\n\nCliquez sur un événement pour gérer ses fermetures de routes.",
    placement: "right",
  },
];

export const eventDetailTutorialSteps: TutorialStep[] = [
  {
    id: "event-welcome",
    target: "body",
    title: "Gestion des fermetures",
    content:
      "Cette page vous permet de définir les fermetures de routes pour votre événement.\n\nIl existe 3 types de fermetures avec des comportements différents.",
    placement: "bottom",
  },
  {
    id: "event-closures-btn",
    target: "[data-tutorial='closures-btn']",
    title: "Menu des fermetures",
    content:
      "Cliquez ici pour ouvrir le menu et choisir le type de fermeture à créer.",
    placement: "right",
  },
  {
    id: "event-barrier",
    target: "[data-tutorial='barrier-btn']",
    title: "Barrage",
    content:
      "Le BARRAGE bloque complètement un point.\n\n✓ Cliquez une fois sur la carte pour placer un barrage\n✓ Parfait pour bloquer un carrefour ou une intersection",
    placement: "right",
  },
  {
    id: "event-segment",
    target: "[data-tutorial='segment-btn']",
    title: "Tronçon",
    content:
      "Le TRONÇON ferme une portion de route.\n\n✓ Cliquez pour placer chaque point du tronçon\n✓ Double-cliquez pour valider le tronçon\n✓ Seul le contour apparaît (pas de remplissage)",
    placement: "right",
  },
  {
    id: "event-zone",
    target: "[data-tutorial='zone-btn']",
    title: "Zone",
    content:
      "La ZONE ferme une zone complète.\n\n✓ Cliquez pour placer chaque coin de la zone\n✓ Double-cliquez pour fermer et valider la zone\n✓ La zone apparaît remplie en rouge",
    placement: "right",
  },
  {
    id: "event-drawing",
    target: ".maplibregl-canvas",
    title: "Dessiner sur la carte",
    content:
      "Après avoir choisi un type :\n\n1️⃣ Cliquez sur la carte pour placer les points\n2️⃣ Pour les tronçons et zones : DOUBLE-CLIQUEZ pour valider\n3️⃣ Un formulaire apparaîtra pour nommer votre fermeture",
    placement: "top",
  },
  {
    id: "event-closures-list",
    target: "[data-tutorial='closures-list']",
    title: "Liste des fermetures",
    content:
      "Toutes vos fermetures apparaissent ici.\n\nVous pouvez les éditer ou les supprimer en cliquant dessus.",
    placement: "left",
  },
];

export const publicEventTutorialSteps: TutorialStep[] = [
  {
    id: "public-welcome",
    target: "body",
    title: "Recherche d'itinéraire",
    content:
      "Cette page vous permet de rechercher un itinéraire qui évite automatiquement les fermetures de routes liées à l'événement.",
    placement: "bottom",
  },
  {
    id: "public-search",
    target: "[data-tutorial='address-search']",
    title: "Rechercher une adresse",
    content:
      "Entrez votre adresse de départ et d'arrivée.\n\nL'application calculera le meilleur itinéraire en évitant les fermetures.",
    placement: "bottom",
  },
  {
    id: "public-navigation",
    target: "[data-tutorial='start-navigation']",
    title: "Démarrer la navigation",
    content:
      "Une fois l'itinéraire calculé, cliquez sur 'Démarrer la navigation' pour obtenir un guidage en temps réel avec votre position GPS.",
    placement: "top",
  },
];
