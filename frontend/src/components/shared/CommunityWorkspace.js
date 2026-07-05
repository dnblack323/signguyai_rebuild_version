import React, { useEffect, useMemo, useState } from "react";
import { AlertCircle, Bug, CheckCircle2, ChevronRight, HelpCircle, Lightbulb, Mail, MessageCircle, Pin, Plus, Search, Send, Star, ThumbsUp, X } from "lucide-react";
import { api } from "../../lib/api";
import { seedCommunityPosts } from "./seedData";

const categories = {
  bug_report: { label: "Bug Report", icon: Bug, tone: "red" },
  feature_request: { label: "Feature Request", icon: Lightbulb, tone: "amber" },
  question: { label: "Question", icon: HelpCircle, tone: "blue" },
  feedback: { label: "Feedback", icon: MessageCircle, tone: "green" },
};

const statusLabels = {
  open: "Open",
  in_progress: "In Progress",
  resolved: "Resolved",
  closed: "Closed",
};

export function CommunityWorkspace({ onToast }) {
  const [posts, setPosts] = useState(seedCommunityPosts);
  const [connection, setConnection] = useState("checking");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("");
  const [selectedPost, setSelectedPost] = useState(null);
  const [composerOpen, setComposerOpen] = useState(false);
  const [draft, setDraft] = useState({ title: "", body: "", category: "question" });
  const [reply, setReply] = useState("");

  useEffect(() => {
    let current = true;
    api("/community/posts")
      .then((response) => {
        if (!current) return;
        setPosts(response.posts?.length ? response.posts : seedCommunityPosts);
        setConnection("connected");
      })
      .catch(() => {
        if (!current) return;
        const stored = localStorage.getItem("community-preview-posts");
        setPosts(stored ? JSON.parse(stored) : seedCommunityPosts);
        setConnection("offline");
      });
    return () => { current = false; };
  }, []);

  const persistLocal = (next) => {
    setPosts(next);
    if (connection !== "connected") localStorage.setItem("community-preview-posts", JSON.stringify(next));
  };

  const filtered = useMemo(() => posts.filter((post) => {
    const matchesQuery = !query || `${post.title} ${post.body} ${post.author_name}`.toLowerCase().includes(query.toLowerCase());
    const matchesCategory = !category || post.category === category;
    const matchesStatus = !status || post.status === status;
    return matchesQuery && matchesCategory && matchesStatus;
  }), [posts, query, category, status]);

  const stats = {
    total_posts: posts.length,
    answered: posts.filter((post) => post.is_answered).length,
    open: posts.filter((post) => post.status === "open").length,
    bug_reports: posts.filter((post) => post.category === "bug_report").length,
    feature_requests: posts.filter((post) => post.category === "feature_request").length,
  };

  const createPost = async () => {
    if (!draft.title.trim() || !draft.body.trim()) return onToast?.("Add a title and description first");
    const payload = { ...draft, author_name: "Shop Admin", status: "open", upvotes: 0, replies: [], created_at: new Date().toISOString() };
    try {
      const created = connection === "connected" ? await api("/community/posts", { method: "POST", body: JSON.stringify(payload) }) : { ...payload, id: `COMM-${Date.now()}` };
      persistLocal([created, ...posts]);
      setComposerOpen(false);
      setDraft({ title: "", body: "", category: "question" });
      onToast?.("Community post submitted");
    } catch {
      onToast?.("Community API unavailable");
    }
  };

  const upvote = async (post) => {
    try {
      if (connection === "connected") {
        const result = await api(`/community/posts/${post.id}/upvote`, { method: "POST" });
        persistLocal(posts.map((row) => row.id === post.id ? { ...row, upvotes: result.upvotes } : row));
      } else {
        persistLocal(posts.map((row) => row.id === post.id ? { ...row, upvotes: Number(row.upvotes || 0) + 1 } : row));
      }
    } catch {
      onToast?.("Could not update upvote");
    }
  };

  const postReply = async () => {
    if (!reply.trim() || !selectedPost) return;
    const payload = { body: reply, author_name: "Shop Admin", is_official: true, created_at: new Date().toISOString() };
    try {
      const updated = connection === "connected"
        ? await api(`/community/posts/${selectedPost.id}/reply`, { method: "POST", body: JSON.stringify(payload) })
        : { ...selectedPost, replies: [...(selectedPost.replies || []), { ...payload, id: `REPLY-${Date.now()}` }], is_answered: true };
      persistLocal(posts.map((post) => post.id === selectedPost.id ? updated : post));
      setSelectedPost(updated);
      setReply("");
    } catch {
      onToast?.("Could not post reply");
    }
  };

  if (selectedPost) {
    const cat = categories[selectedPost.category] || categories.feedback;
    const Icon = cat.icon;
    return (
      <div className="shared-workspace">
        <button className="text-button" onClick={() => setSelectedPost(null)}>Back to Community</button>
        <section className="shared-detail-card">
          <div className="shared-detail-title">
            <span className={`shared-icon ${cat.tone}`}><Icon size={19} /></span>
            <div><h2>{selectedPost.title}</h2><p>{selectedPost.author_name} - {new Date(selectedPost.created_at).toLocaleDateString()}</p></div>
            <span className={`shared-pill ${selectedPost.status}`}>{statusLabels[selectedPost.status] || "Open"}</span>
          </div>
          <p>{selectedPost.body}</p>
          <div className="shared-meta-row">
            {selectedPost.is_pinned && <span><Pin size={14} />Pinned</span>}
            {selectedPost.is_answered && <span><CheckCircle2 size={14} />Answered</span>}
            <button onClick={() => upvote(selectedPost)}><ThumbsUp size={14} />{selectedPost.upvotes || 0}</button>
          </div>
        </section>
        <section className="shared-panel">
          <h2>{selectedPost.replies?.length || 0} Replies</h2>
          {(selectedPost.replies || []).map((row) => <article className="reply-card" key={row.id}><strong>{row.author_name}{row.is_official && <span><Star size={12} />Official</span>}</strong><p>{row.body}</p></article>)}
          <textarea value={reply} onChange={(event) => setReply(event.target.value)} placeholder="Write a reply or official update..." />
          <button className="primary-button" onClick={postReply}><Send size={16} />Post reply</button>
        </section>
      </div>
    );
  }

  return (
    <div className="shared-workspace">
      <section className="shared-toolbar">
        <div><h2>Community message center</h2><p>Bug reports, feature requests, questions, and feedback brought over from the original Community Hub.</p></div>
        <span className={`backend-status ${connection}`}><i />{connection === "connected" ? "Mongo community" : connection === "offline" ? "Local community" : "Checking"}</span>
        <a className="secondary-button" href="mailto:thesigntistslab@gmail.com?subject=SignGuy%20AI%20Support"><Mail size={15} />Support</a>
        <button className="primary-button" onClick={() => setComposerOpen(true)}><Plus size={16} />New post</button>
      </section>
      <section className="shared-stats-grid">
        {[
          ["Total Posts", stats.total_posts, MessageCircle],
          ["Answered", stats.answered, CheckCircle2],
          ["Open", stats.open, AlertCircle],
          ["Bug Reports", stats.bug_reports, Bug],
          ["Feature Requests", stats.feature_requests, Lightbulb],
        ].map(([label, value, Icon]) => <article key={label}><Icon size={17} /><strong>{value}</strong><span>{label}</span></article>)}
      </section>
      <section className="shared-filters">
        <label><Search size={15} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search community posts..." /></label>
        <select value={category} onChange={(event) => setCategory(event.target.value)}><option value="">All categories</option>{Object.entries(categories).map(([id, row]) => <option key={id} value={id}>{row.label}</option>)}</select>
        <select value={status} onChange={(event) => setStatus(event.target.value)}><option value="">All status</option>{Object.entries(statusLabels).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select>
      </section>
      {composerOpen && <section className="shared-composer">
        <div><h2>Create community post</h2><button onClick={() => setComposerOpen(false)}><X size={16} /></button></div>
        <div className="category-picks">{Object.entries(categories).map(([id, row]) => { const Icon = row.icon; return <button key={id} className={draft.category === id ? `active ${row.tone}` : ""} onClick={() => setDraft({ ...draft, category: id })}><Icon size={16} />{row.label}</button>; })}</div>
        <input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} placeholder="Brief summary" />
        <textarea value={draft.body} onChange={(event) => setDraft({ ...draft, body: event.target.value })} placeholder="Details. For bugs, include steps to reproduce." />
        <button className="primary-button" onClick={createPost}><Send size={16} />Submit post</button>
      </section>}
      <section className="community-list">
        {filtered.map((post) => {
          const cat = categories[post.category] || categories.feedback;
          const Icon = cat.icon;
          return <button key={post.id} onClick={() => setSelectedPost(post)} className={post.is_pinned ? "pinned" : ""}>
            <span className={`shared-icon ${cat.tone}`}><Icon size={17} /></span>
            <span><strong>{post.title}</strong><small>{post.body}</small><em>{post.author_name} - {statusLabels[post.status] || "Open"} - {cat.label}</em></span>
            <b>{post.upvotes || 0}</b><ChevronRight size={16} />
          </button>;
        })}
      </section>
    </div>
  );
}
