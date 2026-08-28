import ImageGallery from "../components/ImageGallery.jsx";

export default function VendorGalleryPage({ vendorId }) {
  return (
    <div>
      <div className="section-header">
        <h3>Gallery</h3>
        <span className="small-note">Photos of your stall and produce</span>
      </div>
      <div className="card">
        <ImageGallery vendorId={vendorId} />
      </div>
    </div>
  );
}
