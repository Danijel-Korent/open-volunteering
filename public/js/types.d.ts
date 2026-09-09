/** Shared domain types for checkJs. */

type AccountType = 'user' | 'organization';

interface GeoLocation {
  label: string;
  lat: number;
  lng: number;
}

/** User profile (stored in users.json). */
interface User {
  id: number;
  type: 'user';
  email: string;
  name: string;
  bio?: string;
  location?: GeoLocation | null;
  skills?: string[];
  experience?: string[];
  seekingVolunteering?: boolean;
  weeklyVolunteeringHours?: number;
  avatarFileId?: number;
  createdAt?: string;
}

/** Organization profile (stored in organizations.json). */
interface Organization {
  id: number;
  type: 'organization';
  name: string;
  bio?: string;
  location?: GeoLocation | null;
  avatarFileId?: number;
  createdByUserId?: number;
  createdAt?: string;
  members?: OrganizationMemberRow[];
}

interface OrganizationMemberRow {
  userId: number;
  role: 'admin' | 'member';
  joinedAt?: string;
  user?: { id: number; name: string; type: 'user' };
}

interface Membership {
  organizationId: number;
  organizationName: string;
  role: 'admin' | 'member';
  joinedAt?: string | null;
}

/** Authenticated session account (user or organization). */
type Account = User | Organization;

/** Extended /auth/me response with session context. */
type MeResponse = Account & {
  userId: number;
  activeAccountType: AccountType;
  activeAccountId: number;
  memberships: Membership[];
  organizationRole?: 'admin' | 'member';
  userProfile?: User;
};

interface StoredFile {
  id: number;
  ownerType?: AccountType;
  ownerId: number;
  originalName: string;
  mimeType: string;
  byteSize: number;
  width: number;
  height: number;
  createdAt: string;
  url: string;
  attachedTo?: { type: 'post' | 'user' | 'organization'; id: number } | null;
}

/** Register response includes the one-time generated password. */
type RegisterResponse = User & { generatedPassword: string };

interface Post {
  id: number;
  authorType: AccountType;
  authorId: number;
  postType: 'user_post' | 'org_post';
  content: string;
  likeCount: number;
  shareCount: number;
  imageFileId?: number;
  createdAt: string;
}

interface Position {
  id: number;
  authorType: AccountType;
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
  authorType: AccountType;
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
  authorType: AccountType;
  authorId: number;
  content: string;
  createdAt: string;
  author?: { id: number; name: string; type: AccountType } | null;
}

interface FeedItem {
  feedType: 'user_post' | 'org_post' | 'position' | 'event';
  id: number;
  authorType: AccountType;
  authorId: number;
  author?: Account | null;
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
  hasApplied?: boolean;
  imageFileId?: number;
  imageUrl?: string;
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
  type: 'organization' | 'user' | 'position' | 'event';
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
  userId: number;
  targetType: string;
  targetId: number;
  skillsOffered: string[];
  createdAt: string;
  user?: User | null;
}

interface ProjectDetailResponse {
  project: Project;
  posts: Array<{ id: number; projectId: number; content: string; createdAt: string }>;
}

interface Application {
  id: number;
  positionId: number;
  userId: number;
  status: 'pending' | string;
  createdAt: string;
  user?: User | null;
}

interface AccountRef {
  accountType: AccountType;
  accountId: number;
}

interface Conversation {
  id: number;
  type: 'direct' | 'group';
  title?: string | null;
  createdByType?: AccountType;
  createdBy: number;
  createdAt: string;
  updatedAt: string;
  lastMessagePreview?: string;
  displayName?: string;
  participants?: Account[];
}

interface ConversationInboxItem {
  id: number;
  type: 'direct' | 'group';
  title?: string | null;
  displayName: string;
  participants: Account[];
  lastMessagePreview: string;
  updatedAt: string;
  unreadCount: number;
}

interface ConversationInboxResponse {
  items: ConversationInboxItem[];
  page: number;
  perPage: number;
  totalPages: number;
  totalItems: number;
  totalUnread: number;
}

interface Message {
  id: number;
  conversationId: number;
  authorType: AccountType;
  authorId: number;
  content: string;
  createdAt: string;
  author?: { id: number; name: string; type: AccountType } | null;
}

interface MessagesResponse {
  items: Message[];
  page: number;
  perPage: number;
  totalPages: number;
  totalItems: number;
}

type NotificationType = 'post_comment' | 'position_application' | 'skill_offer';

interface Notification {
  id: number;
  recipientUserId: number;
  type: NotificationType;
  organizationId?: number | null;
  organizationName?: string | null;
  actorType: AccountType;
  actorId: number;
  targetType: 'post' | 'position' | 'event' | 'organization' | 'availability';
  targetId: number;
  readAt: string | null;
  createdAt: string;
  message?: string;
  link?: string;
  actor?: { id: number; name: string; type: AccountType } | null;
}

interface NotificationsResponse {
  items: Notification[];
  totalUnread: number;
  totalItems: number;
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
