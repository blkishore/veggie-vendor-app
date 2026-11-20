import { useState } from "react";

export default function ImageGallery() {
  const [images, setImages] = useState([]);
  const [url, setUrl] = useState("");
  const [error, setError] = useState(null);

  function addImage(e) {
    e.preventDefault();
    setError(null);
    try {
      const imageUrl = new URL(url);
      if (!["http:", "https:"].includes(imageUrl.protocol)) {
        setError("Enter a secure HTTP or HTTPS image URL.");
        return;
      }
      setImages((previous) => [{ id: `${Date.now()}-${url}`, url: imageUrl.href }, ...previous]);
    } catch {
      setError("Enter a valid image URL.");
      return;
    }
    setUrl("");
  }

  return (
    <div>
      <p className="small-note">These are local previews only; photos aren't uploaded or saved between sessions.</p>
      {error && <div className="status-message error" role="alert">{error}</div>}
      <form onSubmit={addImage} className="gallery-form">
        <input
          type="url"
          aria-label="Image URL"
          placeholder="Paste an image URL"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          required
        />
        <button className="primary" type="submit">Preview image</button>
      </form>

      {images.length === 0 ? (
        <p className="empty-state">No image previews yet.</p>
      ) : (
        <div className="gallery-grid">
          {images.map((img) => (
            <div className="gallery-item" key={img.id}>
              <img src={img.url} alt="Produce preview" loading="lazy" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
