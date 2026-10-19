import { useCallback, useEffect, useState } from "react";
import { ImagePlus, Loader2, Download, Trash2, X, CircleAlert, RotateCcw } from "lucide-react";
import { api, errorMessage } from "../../api";
import ui from "../../components/ui/ui.module.css";
import styles from "./ImagesView.module.css";

const IDEAS = [
  "A cozy reading nook with rain on the window, watercolor style",
  "A friendly robot watering plants on a balcony, flat illustration",
  "A futuristic city at sunset, seen from a train window",
  "A simple logo of a mountain and a sun, minimal line art",
];

function SecureImage({id,alt,...props}){
 const [url,setUrl]=useState('');
 useEffect(()=>{let active=true;let objectUrl;
  api.get(`/images/${id}/file`,{responseType:'blob'}).then(({data})=>{
   if(!active)return;objectUrl=URL.createObjectURL(data);setUrl(objectUrl);
  }).catch(()=>{ if(active)setUrl(''); });
  return()=>{active=false;if(objectUrl)URL.revokeObjectURL(objectUrl);};
 },[id]);
 return url ? <img {...props} src={url} alt={alt}/> : <span role="status">Loading image…</span>;
}
function ImagesView() {
  const [images, setImages] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [prompt, setPrompt] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState(null);

  const loadImages = useCallback(async () => {
    try {
      const { data } = await api.get("/images");
      setImages(data.data || []);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => {
    loadImages();
  }, [loadImages]);

  // Close the large preview with Escape
  useEffect(() => {
    if (!preview) return undefined;
    const onKey = (event) => event.key === "Escape" && setPreview(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [preview]);

  async function createImage() {
    const text = prompt.trim();
    if (!text || creating) return;
    setCreating(true);
    setError("");
    try {
      const { data } = await api.post("/images", { prompt: text });
      setImages((current) => [data.data, ...current]);
      setPrompt("");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setCreating(false);
    }
  }

  async function removeImage(image) {
    if (!window.confirm("Delete this image? This cannot be undone.")) return;
    try {
      await api.delete(`/images/${image.id}`);
      setImages((current) => current.filter((item) => item.id !== image.id));
      setPreview((current) => (current?.id === image.id ? null : current));
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  async function downloadImage(image) {
    try {
      const { data: blob } = await api.get(`/images/${image.id}/file`, {responseType:'blob'});
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `image-${image.id}.${image.url.split(".").pop()}`;
      link.click();
      URL.revokeObjectURL(link.href);
    } catch {
      setError('Could not download this image. Please try again.');
    }
  }

  return (
    <div className={ui.page}>
      <div className={ui.inner}>
        <h1 className={ui.title}>Images</h1>
        <p className={ui.subtitle}>
          Describe a picture and the AI will draw it. Your images are saved here so you can come back to them.
        </p>

        <div className={ui.card}>
          <div className={ui.field}>
            <label className={ui.label} htmlFor="image-prompt">
              What should the image show?
            </label>
            <textarea
              id="image-prompt"
              className={ui.textarea}
              value={prompt}
              maxLength={1000}
              placeholder="Describe the subject, style and mood..."
              onChange={(event) => setPrompt(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) createImage();
              }}
              disabled={creating}
            />
          </div>

          <div className={ui.row}>
            <button
              type="button"
              className={`${ui.btn} ${ui.primary}`}
              onClick={createImage}
              disabled={creating || !prompt.trim()}
            >
              {creating ? <Loader2 size={16} className={ui.spin} /> : <ImagePlus size={16} />}
              {creating ? "Creating..." : "Create image"}
            </button>
            <span className={ui.muted}>
              {creating ? "This can take up to a minute." : "Tip: press Ctrl + Enter to create."}
            </span>
          </div>

          {!prompt && !creating && (
            <div className={ui.chips} style={{ marginTop: 16 }}>
              {IDEAS.map((idea) => (
                <button key={idea} type="button" className={ui.chip} onClick={() => setPrompt(idea)}>
                  {idea}
                </button>
              ))}
            </div>
          )}
        </div>

        {error && (
          <div className={ui.error} role="alert" style={{ marginTop: 16 }}>
            <CircleAlert size={18} style={{ flexShrink: 0, marginTop: 1 }} />
            <span>{error}</span>
          </div>
        )}

        <div className={styles.gallery}>
          {creating && (
            <div className={styles.placeholder} aria-live="polite">
              <Loader2 size={26} className={ui.spin} />
              <span>Creating your image...</span>
            </div>
          )}

          {images.map((image) => (
            <figure key={image.id} className={styles.tile}>
              <button
                type="button"
                className={styles.imageBtn}
                onClick={() => setPreview(image)}
                aria-label={`Open image: ${image.prompt}`}
              >
                <SecureImage id={image.id} alt={image.prompt} loading="lazy" />
              </button>
              <figcaption className={styles.caption}>
                <span className={styles.captionText} title={image.prompt}>
                  {image.prompt}
                </span>
                <span className={styles.actions}>
                  <button type="button" className={ui.iconBtn} onClick={() => setPrompt(image.prompt)} title="Use this description again" aria-label="Use this description again">
                    <RotateCcw size={16} />
                  </button>
                  <button type="button" className={ui.iconBtn} onClick={() => downloadImage(image)} title="Download" aria-label="Download image">
                    <Download size={16} />
                  </button>
                  <button type="button" className={ui.iconBtn} onClick={() => removeImage(image)} title="Delete" aria-label="Delete image">
                    <Trash2 size={16} />
                  </button>
                </span>
              </figcaption>
            </figure>
          ))}
        </div>

        {!loadingList && images.length === 0 && !creating && (
          <div className={ui.empty}>No images yet. Describe one above to get started.</div>
        )}
      </div>

      {preview && (
        <div className={styles.lightbox} onClick={() => setPreview(null)} role="dialog" aria-modal="true" aria-label="Image preview">
          <button type="button" className={styles.lightboxClose} onClick={() => setPreview(null)} aria-label="Close preview">
            <X size={22} />
          </button>
          <SecureImage id={preview.id} alt={preview.prompt} onClick={(event) => event.stopPropagation()} />
          <p onClick={(event) => event.stopPropagation()}>{preview.prompt}</p>
        </div>
      )}
    </div>
  );
}

export default ImagesView;
