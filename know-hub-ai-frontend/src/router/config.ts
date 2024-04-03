let routes = [
  {
    path: "/",
    name: "index",
    redirect: "/chat",
    meta: {
      isMenu: false,
    },
  },
  {
    path: "/chat",
    name: "chat",
    component: () => import("@/view/chat/ChatView.vue"),
    meta: {
      isMenu: true,
      description: "对话",
      icon: "ChatDotRound",
    },
  },
  {
    path: "/know-hub",
    name: "knowHub",
    component: () => import("@/view/know/KnowHubView.vue"),
    meta: {
      isMenu: true,
      description: "我的知识库",
      icon: "Collection",
    },
  },
  {
    path: "/upload",
    name: "upload",
    component: () => import("@/view/know/UploadView.vue"),
    meta: {
      isMenu: true,
      description: "知识内容上传",
      icon: "FolderAdd",
    },
  },
  {
    path: "/settings",
    name: "settings",
    component: () => import("@/view/chat/SettingView.vue"),
    meta: {
      isMenu: true,
      description: "设置",
      icon: "Setting",
    },
  },
];

export default routes;
