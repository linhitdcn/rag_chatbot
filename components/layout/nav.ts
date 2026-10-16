import {
  BookOpen, Bot, Code2, FlaskConical, KeyRound, LayoutDashboard, MessageSquare,
  Settings, Users, Gauge, HelpCircle, UserPlus, type LucideIcon,
} from "lucide-react";

export interface NavItem { title: string; href: string; icon: LucideIcon }
export interface NavGroup { label: string; items: NavItem[] }

export const navGroups: NavGroup[] = [
  { label: "Overview", items: [{ title: "Dashboard", href: "/dashboard", icon: LayoutDashboard }] },
  {
    label: "Build",
    items: [
      { title: "Chatbots", href: "/bots", icon: Bot },
      { title: "Knowledge Base", href: "/knowledge", icon: BookOpen },
      { title: "Playground", href: "/playground", icon: FlaskConical },
    ],
  },
  {
    label: "Engage",
    items: [
      { title: "Conversations", href: "/conversations", icon: MessageSquare },
      { title: "Leads", href: "/leads", icon: UserPlus },
      { title: "Unanswered Questions", href: "/unanswered", icon: HelpCircle },
    ],
  },
  { label: "Deploy", items: [{ title: "Widget & Embed", href: "/widget", icon: Code2 }] },
  {
    label: "Settings",
    items: [
      { title: "General", href: "/settings/general", icon: Settings },
      { title: "API Keys", href: "/settings/api-keys", icon: KeyRound },
      { title: "Team", href: "/settings/team", icon: Users },
      { title: "Usage & Limits", href: "/settings/usage", icon: Gauge },
    ],
  },
];

export const allNavItems = navGroups.flatMap((g) => g.items);
