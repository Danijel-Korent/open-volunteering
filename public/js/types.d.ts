/** Shared domain types for checkJs. */

interface GeoLocation {
  label: string;
  lat: number;
  lng: number;
}

interface User {
  id: number;
  type: 'volunteer' | 'organization';
  email: string;
  name: string;
  bio?: string;
  location?: GeoLocation | null;
  skills?: string[];
  experience?: string[];
  createdAt?: string;
}

interface Post {
  id: number;
  authorId: number;
  postType: 'user_post' | 'org_post';
  content: string;
  likeCount: number;
  shareCount: number;
  createdAt: string;
}

interface Position {
  id: number;
  authorId: number;
  title: string;
  description: string;
  category: string;
  remote: boolean;
  location?: GeoLocation | null;
  likeCount: number;
  createdAt: string;
}

interface VolEvent {
  id: number;
  authorId: number;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  locationType: 'physical' | 'online';
  location?: GeoLocation | null;
  likeCount: number;
  createdAt: string;
}

interface Comment {
  id: number;
  targetType: 'post' | 'position' | 'event';
  targetId: number;
  authorId: number;
  content: string;
  createdAt: string;
  author?: { id: number; name: string; type: string } | null;
}

interface FeedItem {
  feedType: 'user_post' | 'org_post' | 'position' | 'event';
  id: number;
  authorId: number;
  author?: User | null;
  content: string;
  title?: string;
  likeCount: number;
  shareCount?: number;
  createdAt: string;
  startDate?: string;
  endDate?: string;
  locationType?: string;
  location?: GeoLocation | null;
  remote?: boolean;
  category?: string;
}

interface FeedResponse {
  items: FeedItem[];
  page: number;
  perPage: number;
  totalPages: number;
  totalItems: number;
}

interface Project {
  id: number;
  orgId: number;
  title: string;
  description: string;
  createdAt: string;
}

interface MapMarker {
  type: 'organization' | 'volunteer' | 'position' | 'event';
  id: number;
  name: string;
  lat: number;
  lng: number;
  label: string;
}

interface Subscription {
  id: number;
  userId: number;
  filterType: 'category' | 'organization' | 'location';
  value: string;
  createdAt: string;
}

interface Availability {
  id: number;
  volunteerId: number;
  targetType: string;
  targetId: number;
  skillsOffered: string[];
  createdAt: string;
  volunteer?: User | null;
}

interface ProjectDetailResponse {
  project: Project;
  posts: Array<{ id: number; projectId: number; content: string; createdAt: string }>;
}

/** Leaflet global from CDN */
declare const L: {
  map: (id: string) => LMap;
  tileLayer: (url: string, opts: object) => { addTo: (map: LMap) => void };
  marker: (latlng: [number, number], opts?: object) => LMarker;
  divIcon: (opts: object) => object;
};

interface LMap {
  setView: (center: [number, number], zoom: number) => LMap;
  fitBounds: (bounds: [number, number][], opts?: object) => void;
  remove: () => void;
  invalidateSize: () => void;
}

interface LMarker {
  addTo: (map: LMap) => LMarker;
  bindPopup: (html: string) => LMarker;
}
