'use client';

import { useEffect, useState } from 'react';
import L from 'leaflet';
import { MapContainer, Marker, Polygon, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { PNU_CAMPUS, PNU_CENTER } from './campus';

export type MapCat = {
  id: string;
  name: string;
  place: string;
  note: string;
  spottedBy: string;
  spottedAt: string;
  lat: number;
  lng: number;
  photo: string;
  coat?: CatCoat;
  gallery?: CatPhoto[];
  personality?: string;
  likes?: string;
  favoriteSpot?: string;
  caution?: string;
};

export type CatCoat = 'gray' | 'orange' | 'calico' | 'black' | 'white';

export type CatPhoto = {
  id: string;
  url: string;
  spottedAt: string;
  caption?: string;
  uploadedBy?: string;
};

type Props = {
  cats: MapCat[];
  selectedId: string | null;
  onSelect: (cat: MapCat) => void;
  onMapClick: (lat: number, lng: number) => void;
  focusPosition?: [number, number] | null;
};

function MapEvents({ onMapClick }: Pick<Props, 'onMapClick'>) {
  useMapEvents({
    click(event) {
      onMapClick(event.latlng.lat, event.latlng.lng);
    },
  });
  return null;
}

function FocusController({ position }: { position?: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (position) map.flyTo(position, 16, { duration: 0.8 });
  }, [map, position]);
  return null;
}

function catIcon(cat: MapCat, active: boolean, zoom: number) {
  const coatIndex: Record<CatCoat, number> = {
    gray: 0,
    orange: 1,
    calico: 2,
    black: 3,
    white: 4,
  };
  const fallbackCoat: CatCoat = cat.name === '치즈' ? 'orange' : cat.name === '구름' ? 'white' : cat.name === '턱시도' ? 'black' : 'gray';
  const spriteIndex = coatIndex[cat.coat ?? fallbackCoat];
  const size = Math.round(Math.max(40, Math.min(68, 40 + (zoom - 13) * 7)));
  return L.divIcon({
    className: 'cat-pin-wrap',
    iconSize: [size, Math.round(size * 1.03)],
    iconAnchor: [Math.round(size / 2), Math.round(size * 0.92)],
    popupAnchor: [0, -Math.round(size * 0.9)],
    html: `<div class="pixel-cat-pin pixel-cat-${spriteIndex} ${active ? 'is-active' : ''}" aria-hidden="true"></div>`,
  });
}

function CatMarkers({ cats, selectedId, onSelect }: Pick<Props, 'cats' | 'selectedId' | 'onSelect'>) {
  const map = useMap();
  const [zoom, setZoom] = useState(map.getZoom());

  useMapEvents({
    zoomend(event) {
      setZoom(event.target.getZoom());
    },
  });

  return cats.map((cat) => (
    <Marker
      key={cat.id}
      position={[cat.lat, cat.lng]}
      icon={catIcon(cat, cat.id === selectedId, zoom)}
      eventHandlers={{
        click(event) {
          L.DomEvent.stopPropagation(event.originalEvent);
          onSelect(cat);
        },
      }}
    />
  ));
}

export default function CatMap({ cats, selectedId, onSelect, onMapClick, focusPosition }: Props) {
  return (
    <MapContainer
      center={PNU_CENTER}
      zoom={16}
      minZoom={10}
      maxZoom={18}
      className="leaflet-map"
      zoomControl={false}
      attributionControl
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        maxNativeZoom={18}
        maxZoom={18}
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MapEvents onMapClick={onMapClick} />
      <FocusController position={focusPosition} />
      <Polygon
        positions={PNU_CAMPUS}
        pathOptions={{ color: '#61609a', weight: 3, opacity: 0.9, fillColor: '#f4ed36', fillOpacity: 0.06, dashArray: '8 8', interactive: false }}
      />
      <CatMarkers cats={cats} selectedId={selectedId} onSelect={onSelect} />
    </MapContainer>
  );
}
