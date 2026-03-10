import React, { useEffect, useMemo, useState } from "react";
import {
  getConversations,
  getConversationMessages,
  sendConversationMessage,
} from "../../services/api";

const TABS = ["Todos", "Ofertas", "Soporte", "Novedades", "Prioridad"];

const formatRelative = (value) => {
  if (!value) return "";
  try {
    const now = new Date();
    const date = new Date(value);
    const diffMs = now - date;
    const diffMin = Math.floor(diffMs / 60000);
    const diffHour = Math.floor(diffMs / 3600000);
    const diffDay = Math.floor(diffMs / 86400000);

    if (diffMin < 1) return "Ahora";
    if (diffMin < 60) return `Hace ${diffMin}m`;
    if (diffHour < 24) return `Hace ${diffHour}h`;
    return `Hace ${diffDay}d`;
  } catch {
    return "";
  }
};

const formatTime = (value) => {
  if (!value) return "";
  try {
    const d = new Date(value);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
};

function getInitials(user) {
  const name = user?.full_name || user?.email || "U";
  return name.charAt(0).toUpperCase();
}

function getConversationTitle(user) {
  return user?.full_name || user?.email || "Usuario";
}

function getConversationSubtitle(user) {
  return user?.role === "barber" ? "Barber disponible" : "Cliente BarberOn";
}

export default function Inbox() {
  const token = localStorage.getItem("token");
  const storedUser = localStorage.getItem("user");

  const currentUser = useMemo(() => {
    try {
      return storedUser ? JSON.parse(storedUser) : null;
    } catch {
      return null;
    }
  }, [storedUser]);

  const [activeTab, setActiveTab] = useState("Todos");
  const [view, setView] = useState("list");
  const [promoCode, setPromoCode] = useState("");

  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);

  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [selectedOtherUser, setSelectedOtherUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState("");
  const [error, setError] = useState("");

  const loadConversations = async (keepSelectedId = null) => {
    if (!token) return;

    try {
      setLoadingConversations(true);
      setError("");

      const data = await getConversations(token);
      const list = data?.results || [];
      setConversations(list);

      if (keepSelectedId) {
        const found = list.find((item) => item?.conversation?.id === keepSelectedId);
        if (found) {
          setSelectedConversation(found.conversation);
          setSelectedOtherUser(found.other_user);
        }
      }
    } catch (err) {
      setError("No pudimos cargar la bandeja de entrada.");
      setConversations([]);
    } finally {
      setLoadingConversations(false);
    }
  };

  const openConversation = async (item) => {
    if (!item?.conversation?.id) return;

    setSelectedConversation(item.conversation);
    setSelectedOtherUser(item.other_user);
    setView("chat");

    try {
      setLoadingMessages(true);
      setError("");
      const data = await getConversationMessages(item.conversation.id, token);
      setMessages(data?.results || []);
    } catch (err) {
      setError("No pudimos cargar la conversación.");
      setMessages([]);
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleSend = async () => {
    const text = messageText.trim();
    if (!text || !selectedConversation?.id) return;

    try {
      setError("");
      const res = await sendConversationMessage(selectedConversation.id, text, token);
      if (res?.message) {
        setMessages((prev) => [...prev, res.message]);
        setMessageText("");
        await loadConversations(selectedConversation.id);
      }
    } catch (err) {
      setError("No pudimos enviar el mensaje.");
    }
  };

  useEffect(() => {
    loadConversations();
  }, []);

  const filteredConversations = conversations.filter((item) => {
    if (activeTab === "Todos") return true;

    const lastText = (item?.last_message?.text || "").toLowerCase();

    if (activeTab === "Ofertas") {
      return lastText.includes("offer") || lastText.includes("oferta") || lastText.includes("discount");
    }
    if (activeTab === "Soporte") {
      return lastText.includes("support") || lastText.includes("soporte") || lastText.includes("help");
    }
    if (activeTab === "Novedades") {
      return lastText.includes("new") || lastText.includes("nuevo") || lastText.includes("update");
    }
    if (activeTab === "Prioridad") {
      return item?.unread_count > 0;
    }

    return true;
  });

  return (
    <div
      style={{
        minHeight: "100%",
        background:
          "radial-gradient(circle at top, rgba(197,154,75,0.13), transparent 22%), #050505",
        color: "#f5f5f5",
        paddingBottom: 98,
      }}
    >
      <div
        style={{
          maxWidth: 520,
          margin: "0 auto",
          minHeight: "100%",
          padding: "18px 14px 0",
        }}
      >
        {view === "list" ? (
          <>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 18,
              }}
            >
              <button
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 999,
                  border: "1px solid rgba(197,154,75,0.20)",
                  background: "rgba(255,255,255,0.03)",
                  color: "#f4d08c",
                  fontSize: 22,
                  cursor: "pointer",
                }}
              >
                ←
              </button>

              <div
                style={{
                  fontSize: 22,
                  fontWeight: 800,
                  color: "#f0d090",
                  letterSpacing: "-0.02em",
                }}
              >
                BarberOn
              </div>

              <div style={{ display: "flex", gap: 8 }}>
                <button
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 999,
                    border: "1px solid rgba(197,154,75,0.20)",
                    background: "rgba(255,255,255,0.03)",
                    color: "#f4d08c",
                    fontSize: 18,
                    cursor: "pointer",
                  }}
                >
                  🎧
                </button>
                <button
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 999,
                    border: "1px solid rgba(197,154,75,0.20)",
                    background: "rgba(255,255,255,0.03)",
                    color: "#f4d08c",
                    fontSize: 18,
                    cursor: "pointer",
                  }}
                >
                  ⋯
                </button>
              </div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <h1
                style={{
                  margin: 0,
                  fontSize: 28,
                  fontWeight: 900,
                  letterSpacing: "-0.03em",
                  color: "#fff7e8",
                }}
              >
                Bandeja de entrada
              </h1>
              <p
                style={{
                  margin: "6px 0 0",
                  color: "rgba(255,255,255,0.70)",
                  fontSize: 15,
                }}
              >
                Mensajes directos con barberías y barberos
              </p>
            </div>

            <div
              style={{
                display: "flex",
                gap: 10,
                overflowX: "auto",
                paddingBottom: 6,
                marginBottom: 16,
              }}
            >
              {TABS.map((tab) => {
                const active = activeTab === tab;
                return (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    style={{
                      whiteSpace: "nowrap",
                      borderRadius: 999,
                      padding: "11px 16px",
                      border: active
                        ? "1px solid rgba(240,208,144,0.45)"
                        : "1px solid rgba(255,255,255,0.06)",
                      background: active
                        ? "linear-gradient(135deg, rgba(197,154,75,0.18), rgba(197,154,75,0.06))"
                        : "rgba(255,255,255,0.03)",
                      color: active ? "#f4d08c" : "rgba(255,255,255,0.78)",
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    {tab}
                  </button>
                );
              })}
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                background: "linear-gradient(135deg, rgba(255,255,255,0.03), rgba(197,154,75,0.05))",
                border: "1px solid rgba(197,154,75,0.18)",
                borderRadius: 18,
                padding: "14px 16px",
                marginBottom: 16,
              }}
            >
              <div style={{ color: "#d6ac5d", fontSize: 20 }}>🏷️</div>
              <input
                value={promoCode}
                onChange={(e) => setPromoCode(e.target.value)}
                placeholder="Agrega el código de la oferta"
                style={{
                  flex: 1,
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  color: "#fff",
                  fontSize: 15,
                }}
              />
            </div>

            {error ? (
              <div
                style={{
                  marginBottom: 14,
                  background: "rgba(197,154,75,0.08)",
                  border: "1px solid rgba(197,154,75,0.22)",
                  color: "#f4d08c",
                  borderRadius: 18,
                  padding: "14px 16px",
                }}
              >
                {error}
              </div>
            ) : null}

            {loadingConversations ? (
              <div
                style={{
                  padding: 18,
                  borderRadius: 22,
                  border: "1px solid rgba(197,154,75,0.14)",
                  background: "rgba(255,255,255,0.03)",
                  color: "rgba(255,255,255,0.7)",
                }}
              >
                Cargando conversaciones...
              </div>
            ) : filteredConversations.length === 0 ? (
              <div
                style={{
                  padding: 22,
                  borderRadius: 22,
                  border: "1px solid rgba(197,154,75,0.14)",
                  background: "rgba(255,255,255,0.03)",
                  color: "rgba(255,255,255,0.72)",
                  lineHeight: 1.55,
                }}
              >
                Todavía no tienes conversaciones.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {filteredConversations.map((item) => {
                  const other = item.other_user;
                  const isUnread = item.unread_count > 0;
                  const title = getConversationTitle(other);
                  const subtitle = getConversationSubtitle(other);
                  const preview = item?.last_message?.text || "Nueva conversación";
                  const time = formatRelative(item?.last_message?.created_at || item?.conversation?.updated_at);

                  return (
                    <div
                      key={item.conversation.id}
                      style={{
                        background:
                          "radial-gradient(circle at top, rgba(197,154,75,0.11), transparent 70%), rgba(255,255,255,0.03)",
                        border: "1px solid rgba(197,154,75,0.24)",
                        borderRadius: 24,
                        padding: 16,
                        boxShadow: "0 10px 28px rgba(0,0,0,0.25)",
                      }}
                    >
                      <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                        <div
                          style={{
                            width: 68,
                            height: 68,
                            borderRadius: "50%",
                            background:
                              "linear-gradient(135deg, rgba(197,154,75,0.35), rgba(197,154,75,0.08))",
                            border: "1px solid rgba(240,208,144,0.32)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "#f4d08c",
                            fontWeight: 900,
                            fontSize: 24,
                            flexShrink: 0,
                          }}
                        >
                          {getInitials(other)}
                        </div>

                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              gap: 10,
                              alignItems: "center",
                            }}
                          >
                            <div
                              style={{
                                fontSize: 17,
                                fontWeight: 800,
                                color: "#fff3d9",
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                              }}
                            >
                              {title}
                            </div>

                            <div
                              style={{
                                fontSize: 13,
                                color: isUnread ? "#f4d08c" : "rgba(255,255,255,0.58)",
                                fontWeight: 700,
                                flexShrink: 0,
                              }}
                            >
                              {isUnread ? "Nuevo" : "Respondido"}
                            </div>
                          </div>

                          <div
                            style={{
                              marginTop: 2,
                              color: "#d9b97c",
                              fontSize: 14,
                              fontWeight: 600,
                            }}
                          >
                            {subtitle}
                          </div>

                          <div
                            style={{
                              marginTop: 10,
                              color: "rgba(255,255,255,0.82)",
                              fontSize: 15,
                              lineHeight: 1.45,
                            }}
                          >
                            {preview}
                          </div>
                        </div>
                      </div>

                      <div
                        style={{
                          marginTop: 14,
                          paddingTop: 14,
                          borderTop: "1px solid rgba(197,154,75,0.14)",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          gap: 10,
                        }}
                      >
                        <div
                          style={{
                            color: "rgba(255,255,255,0.72)",
                            fontSize: 14,
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                          }}
                        >
                          <span>🕒</span>
                          <span>{time}</span>
                        </div>

                        <button
                          onClick={() => openConversation(item)}
                          style={{
                            border: "none",
                            borderRadius: 999,
                            padding: "12px 24px",
                            background: "linear-gradient(135deg, #c59a4b, #f0d090)",
                            color: "#111",
                            fontWeight: 800,
                            fontSize: 15,
                            cursor: "pointer",
                            boxShadow: "0 8px 18px rgba(197,154,75,0.25)",
                          }}
                        >
                          {isUnread ? "Responder" : "Ver"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        ) : (
          <>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                marginBottom: 14,
              }}
            >
              <button
                onClick={() => setView("list")}
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 999,
                  border: "1px solid rgba(197,154,75,0.20)",
                  background: "rgba(255,255,255,0.03)",
                  color: "#f4d08c",
                  fontSize: 22,
                  cursor: "pointer",
                }}
              >
                ←
              </button>

              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: "50%",
                  background:
                    "linear-gradient(135deg, rgba(197,154,75,0.35), rgba(197,154,75,0.08))",
                  border: "1px solid rgba(240,208,144,0.32)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#f4d08c",
                  fontWeight: 900,
                  fontSize: 20,
                  flexShrink: 0,
                }}
              >
                {getInitials(selectedOtherUser)}
              </div>

              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    color: "#fff3d9",
                    fontWeight: 800,
                    fontSize: 18,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {getConversationTitle(selectedOtherUser)}
                </div>
                <div
                  style={{
                    color: "rgba(255,255,255,0.62)",
                    fontSize: 13,
                  }}
                >
                  {getConversationSubtitle(selectedOtherUser)}
                </div>
              </div>
            </div>

            <div
              style={{
                minHeight: "calc(100vh - 240px)",
                borderRadius: 24,
                border: "1px solid rgba(197,154,75,0.18)",
                background:
                  "radial-gradient(circle at top, rgba(197,154,75,0.10), transparent 30%), rgba(255,255,255,0.03)",
                padding: 16,
                display: "flex",
                flexDirection: "column",
              }}
            >
              <div
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                  overflowY: "auto",
                  paddingBottom: 16,
                }}
              >
                {loadingMessages ? (
                  <div style={{ color: "rgba(255,255,255,0.7)" }}>Cargando mensajes...</div>
                ) : messages.length === 0 ? (
                  <div
                    style={{
                      margin: "auto",
                      textAlign: "center",
                      color: "rgba(255,255,255,0.70)",
                    }}
                  >
                    Todavía no hay mensajes en esta conversación.
                  </div>
                ) : (
                  messages.map((msg) => {
                    const mine = Number(msg.sender_id) === Number(currentUser?.id);

                    return (
                      <div
                        key={msg.id}
                        style={{
                          display: "flex",
                          justifyContent: mine ? "flex-end" : "flex-start",
                        }}
                      >
                        <div
                          style={{
                            maxWidth: "78%",
                            padding: "12px 14px",
                            borderRadius: mine ? "18px 18px 6px 18px" : "18px 18px 18px 6px",
                            background: mine
                              ? "linear-gradient(135deg, #c59a4b, #f0d090)"
                              : "rgba(255,255,255,0.07)",
                            color: mine ? "#111" : "#fff",
                            border: mine
                              ? "1px solid rgba(255,255,255,0.08)"
                              : "1px solid rgba(197,154,75,0.12)",
                          }}
                        >
                          <div style={{ fontSize: 15, lineHeight: 1.45 }}>{msg.text}</div>
                          <div
                            style={{
                              marginTop: 6,
                              textAlign: "right",
                              fontSize: 11,
                              opacity: 0.72,
                            }}
                          >
                            {formatTime(msg.created_at)}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div
                style={{
                  paddingTop: 12,
                  borderTop: "1px solid rgba(197,154,75,0.12)",
                  display: "flex",
                  gap: 10,
                  alignItems: "flex-end",
                }}
              >
                <textarea
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  rows={2}
                  placeholder="Escribe tu mensaje..."
                  style={{
                    flex: 1,
                    resize: "none",
                    borderRadius: 18,
                    border: "1px solid rgba(197,154,75,0.18)",
                    background: "rgba(255,255,255,0.03)",
                    color: "#fff",
                    padding: "14px 16px",
                    outline: "none",
                    fontSize: 14,
                  }}
                />
                <button
                  onClick={handleSend}
                  style={{
                    border: "none",
                    borderRadius: 18,
                    padding: "14px 18px",
                    background: "linear-gradient(135deg, #c59a4b, #f0d090)",
                    color: "#111",
                    fontWeight: 800,
                    cursor: "pointer",
                    minWidth: 104,
                  }}
                >
                  Enviar
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}