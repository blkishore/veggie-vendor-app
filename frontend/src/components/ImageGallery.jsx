import { useState } from "react";

export default function ImageGallery({ vendorId = 0 }) {
  const [images, setImages] = useState([]);
  const [url, setUrl] = useState("");

  function addImage(e) {
    e.preventDefault();
    if (!url) return;
    setImages((s) => [{ id: Date.now(), url }, ...s]);
    setUrl("");
  }

  return (
    <div>
      <form onSubmit={addImage} className="gallery-form">
        <input
          placeholder="Image URL (or paste from clipboard)"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
        <button className="primary" type="submit">Add</button>
      </form>

      {images.length === 0 ? (
        <p className="empty-state">No images yet — add a photo of produce or artwork.</p>
      ) : (
        <div className="gallery-grid">
          {images.map((img) => (
            <div className="gallery-item" key={img.id}>
              <img src={img.url} alt="uploaded" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
