import ImageGallery from "../components/ImageGallery.jsx";

export default function VendorGalleryPage() {
  return (
    <div>
      <div className="section-header">
        <div>
          <h3>Image previews</h3>
          <span className="small-note">Try how a product image looks before sharing it.</span>
        </div>
      </div>
      <ImageGallery />
    </div>
  );
}
