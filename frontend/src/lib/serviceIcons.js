import {
  Briefcase, Video, Users, BarChart3, BookOpen, Target, Shield,
  GraduationCap, Headphones, Globe, TrendingUp, Link as LinkIcon,
  MessageSquare, Award, Zap, Star, Calendar, DollarSign, Lightbulb,
  ClipboardList, Palmtree, Phone
} from 'lucide-react';

// Map of icon name (string stored in DB) -> Lucide component.
// Used to render admin-managed services that store an icon name.
export const SERVICE_ICONS = {
  Briefcase, Video, Users, BarChart3, BookOpen, Target, Shield,
  GraduationCap, Headphones, HeadphonesIcon: Headphones, Globe, TrendingUp,
  LinkIcon, Link: LinkIcon, MessageSquare, Award, Zap, Star, Calendar,
  DollarSign, Lightbulb, ClipboardList, Palmtree, Phone
};

// Ordered list of names for the admin icon picker
export const SERVICE_ICON_NAMES = Object.keys(SERVICE_ICONS).filter(
  (name) => !['HeadphonesIcon', 'Link'].includes(name)
);

// Resolve an icon name to a component, defaulting to Briefcase
export const getServiceIcon = (name) => SERVICE_ICONS[name] || Briefcase;
