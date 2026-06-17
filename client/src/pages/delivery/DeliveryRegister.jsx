import { useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { registerDeliveryPartner } from "../../redux/slices/deliveryAuthSlice";

const initialForm = {
  fullName: "",
  profilePhotoJpg: "",
  dateOfBirth: "",
  gender: "",
  mobileNumber: "",
  email: "",
  currentAddress: "",
  aadhaarNumber: "",
  panNumber: "",
  vehicleType: "",
  vehicleNumber: "",
  deliveryCity: "",
  availability: "",
  workingHours: "",
  password: "",
  confirmPassword: "",
  liveLocationPermission: false,
  createEarningsWallet: false,
};

export default function DeliveryRegister() {
  const [formData, setFormData] = useState(initialForm);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formError, setFormError] = useState("");
  const maxPhotoSizeBytes = 2 * 1024 * 1024; // 2MB

  // Cropping States
  const [showCropModal, setShowCropModal] = useState(false);
  const [tempImage, setTempImage] = useState("");
  const [cropParams, setCropParams] = useState({ x: 50, y: 50, scale: 1 });
  const canvasRef = useRef(null);

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading, error, registered } = useSelector(
    (state) => state.deliveryAuth
  );

  const passwordsMatch =
    formData.password.length === 0 || formData.confirmPassword.length === 0
      ? true
      : formData.password === formData.confirmPassword;

  const handleChange = (e) => {
    const { name } = e.target;
    let { value } = e.target;
    if (formError) {
      setFormError("");
    }

    if (name === "mobileNumber") {
      value = value.replace(/\D/g, "").slice(0, 10);
    }

    if (name === "aadhaarNumber") {
      value = value.replace(/\D/g, "").slice(0, 12);
    }

    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) {
      if (formError) {
        setFormError("");
      }
      setFormData((prev) => ({ ...prev, profilePhotoJpg: "" }));
      return;
    }
    const isJpg =
      file.type === "image/jpeg" || file.name.toLowerCase().endsWith(".jpg") || file.name.toLowerCase().endsWith(".jpeg");
    if (!isJpg) {
      setFormError("Profile photo must be a JPG image.");
      e.target.value = "";
      setFormData((prev) => ({ ...prev, profilePhotoJpg: "" }));
      return;
    }
    if (file.size > maxPhotoSizeBytes) {
      setFormError("Profile photo must be 2MB or smaller.");
      e.target.value = "";
      setFormData((prev) => ({ ...prev, profilePhotoJpg: "" }));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      setTempImage(result);
      setShowCropModal(true);
      setCropParams({ x: 50, y: 50, scale: 1 }); // Reset for new upload
    };
    reader.readAsDataURL(file);
  };

  const applyCrop = () => {
    const canvas = canvasRef.current;
    if (!canvas || !tempImage) return;

    const img = new Image();
    img.onload = () => {
      const ctx = canvas.getContext("2d");
      const size = 400; // Output resolution
      canvas.width = size;
      canvas.height = size;

      // Fill background (fallback)
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, size, size);

      const imgAspect = img.width / img.height;
      const scale = cropParams.scale;
      
      let drawW, drawH;
      // Determine base 'cover' size
      if (imgAspect > 1) {
        drawH = size;
        drawW = size * imgAspect;
      } else {
        drawW = size;
        drawH = size / imgAspect;
      }

      // Apply user scale
      drawW *= scale;
      drawH *= scale;

      // Calculate offsets to match CSS (center of image at percentage point)
      const xOffset = (size / 2) - (drawW * (cropParams.x / 100));
      const yOffset = (size / 2) - (drawH * (cropParams.y / 100));

      ctx.drawImage(img, xOffset, yOffset, drawW, drawH);
      
      try {
        const croppedBase64 = canvas.toDataURL("image/jpeg", 0.9);
        setFormData(prev => ({ ...prev, profilePhotoJpg: croppedBase64 }));
        setShowCropModal(false);
      } catch (err) {
        console.error("Canvas export failed", err);
      }
    };
    img.onerror = () => setShowCropModal(false);
    img.src = tempImage;
  };

  const cancelCrop = () => {
    setShowCropModal(false);
    if (!formData.profilePhotoJpg) {
      setTempImage("");
    }
  };

  const handleCheckbox = (e) => {
    const { name, checked } = e.target;
    if (formError) {
      setFormError("");
    }
    setFormData((prev) => ({ ...prev, [name]: checked }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!formData.profilePhotoJpg) {
      setFormError("Please upload a JPG profile photo.");
      return;
    }

    if (formData.mobileNumber.length !== 10) {
      setFormError("Mobile number must be exactly 10 digits.");
      return;
    }

    if (formData.aadhaarNumber.length !== 12) {
      setFormError("Aadhaar number must be exactly 12 digits.");
      return;
    }

    if (!passwordsMatch) {
      setFormError("Passwords do not match.");
      return;
    }

    const payload = {
      fullName: formData.fullName,
      profilePhotoJpg: formData.profilePhotoJpg,
      dateOfBirth: formData.dateOfBirth,
      gender: formData.gender || "prefer-not",
      mobileNumber: formData.mobileNumber,
      email: formData.email,
      currentAddress: formData.currentAddress,
      aadhaarNumber: formData.aadhaarNumber,
      panNumber: formData.panNumber,
      vehicleType: formData.vehicleType,
      vehicleNumber: formData.vehicleNumber,
      deliveryCity: formData.deliveryCity,
      availability: formData.availability,
      workingHours: formData.workingHours,
      password: formData.password,
      liveLocationPermission: formData.liveLocationPermission,
      createEarningsWallet: formData.createEarningsWallet,
    };

    setFormError("");
    dispatch(registerDeliveryPartner(payload)).then((res) => {
      if (res.meta.requestStatus === "fulfilled") {
        navigate("/delivery/login");
      }
    });
  };

  return (
    <div className="min-h-screen bg-[#f7f5f2] px-4 py-10">
      <div className="max-w-3xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
              Delivery Partner Registration
            </h1>
            <p className="text-slate-600 mt-1">
              Create your account to start accepting deliveries.
            </p>
          </div>
          <Link
            to="/delivery/login"
            className="text-sky-700 font-semibold hover:underline text-sm"
          >
            Back to login
          </Link>
        </div>

        {(formError || error) && (
          <p className="text-rose-600 text-sm mb-4 text-center font-semibold bg-rose-50 p-2 rounded">
            {formError || error}
          </p>
        )}
        {registered && !error && (
          <p className="text-emerald-700 text-sm mb-4 text-center font-semibold bg-emerald-50 p-2 rounded">
            Registration successful. Please login.
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <section className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-8 w-1.5 bg-sky-600 rounded-full" />
              <h2 className="text-lg font-bold text-slate-900 uppercase tracking-tight">Basic Details</h2>
            </div>
            <div className="mt-4 grid sm:grid-cols-2 gap-4">
              <input
                type="text"
                name="fullName"
                placeholder="Full Name"
                className="w-full border p-3.5 rounded-xl focus:ring-2 outline-none transition focus:ring-sky-500 border-slate-200 bg-slate-50/30 font-medium placeholder:text-slate-400"
                value={formData.fullName}
                onChange={handleChange}
                required
              />
              <div className="flex flex-col sm:flex-row items-center gap-6 p-6 rounded-2xl bg-linear-to-br from-slate-50 to-sky-50/30 border border-slate-200 sm:col-span-2 shadow-sm ring-1 ring-slate-100">
                <div className="relative h-24 w-24 rounded-full border-4 border-white flex items-center justify-center overflow-hidden bg-white shrink-0 shadow-md group ring-1 ring-slate-200">
                  {formData.profilePhotoJpg ? (
                    <>
                      <img
                        src={formData.profilePhotoJpg}
                        alt="Preview"
                        className="h-full w-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, profilePhotoJpg: "" }))}
                        className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Remove Photo"
                      >
                        <span className="text-white text-[10px] font-bold uppercase tracking-wider">Remove</span>
                      </button>
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center text-slate-400 gap-1">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                      <span className="text-[10px] font-bold uppercase tracking-tighter text-center">Photo</span>
                    </div>
                  )}
                </div>
                <div className="flex-1 w-full">
                  <label className="block text-xs font-extrabold text-slate-600 uppercase mb-2 ml-1 tracking-wider">Profile Photo <span className="text-sky-600 ml-1 text-[10px] normal-case font-medium italic">- Circle crop applied</span></label>
                  <input
                    type="file"
                    name="profilePhotoJpg"
                    accept=".jpg,.jpeg,image/jpeg"
                    className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-sky-50 file:text-sky-700 hover:file:bg-sky-100 transition-all cursor-pointer"
                    onChange={handlePhotoChange}
                    required
                  />
                  <p className="mt-2 text-[10px] text-slate-400 font-medium ml-1">A professional photo increases trust with customers.</p>
                </div>
              </div>
              <input
                type="date"
                name="dateOfBirth"
                placeholder="Date of Birth (optional)"
                className="w-full border p-3.5 rounded-xl focus:ring-2 outline-none transition focus:ring-sky-500 border-slate-200 bg-slate-50/30 font-medium"
                value={formData.dateOfBirth}
                onChange={handleChange}
                required
              />
              <select
                name="gender"
                className="w-full border p-3.5 rounded-xl focus:ring-2 outline-none transition focus:ring-sky-500 border-slate-200 bg-slate-50/30 font-medium"
                value={formData.gender}
                onChange={handleChange}
              >
                <option value="">Gender (optional)</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
                <option value="prefer-not">Prefer not to say</option>
              </select>
            </div>
          </section>

          <section className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6">
            <h2 className="text-lg font-bold text-slate-900">
              Contact Information
            </h2>
            <div className="mt-4 grid sm:grid-cols-2 gap-4">
              <input
                type="tel"
                name="mobileNumber"
                placeholder="Mobile Number"
                className="w-full border p-3 rounded-xl focus:ring-2 outline-none transition focus:ring-sky-500 border-slate-200"
                value={formData.mobileNumber}
                onChange={handleChange}
                inputMode="numeric"
                pattern="[0-9]{10}"
                maxLength={10}
                required
              />
              <input
                type="email"
                name="email"
                placeholder="Email ID"
                className="w-full border p-3 rounded-xl focus:ring-2 outline-none transition focus:ring-sky-500 border-slate-200"
                value={formData.email}
                onChange={handleChange}
                required
              />
              <input
                type="text"
                name="currentAddress"
                placeholder="Current Address / Location"
                className="w-full border p-3 rounded-xl focus:ring-2 outline-none transition focus:ring-sky-500 border-slate-200 sm:col-span-2"
                value={formData.currentAddress}
                onChange={handleChange}
                required
              />
            </div>
          </section>

          <section className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6">
            <h2 className="text-lg font-bold text-slate-900">
              Identity & Verification
            </h2>
            <div className="mt-4 grid sm:grid-cols-2 gap-4">
              <input
                type="text"
                name="aadhaarNumber"
                placeholder="Aadhaar Number / ID Proof"
                className="w-full border p-3 rounded-xl focus:ring-2 outline-none transition focus:ring-sky-500 border-slate-200"
                value={formData.aadhaarNumber}
                onChange={handleChange}
                inputMode="numeric"
                pattern="[0-9]{12}"
                maxLength={12}
                required
              />
              <input
                type="text"
                name="panNumber"
                placeholder="PAN Card (optional)"
                className="w-full border p-3 rounded-xl focus:ring-2 outline-none transition focus:ring-sky-500 border-slate-200"
                value={formData.panNumber}
                onChange={handleChange}
              />
            </div>
          </section>

          <section className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6">
            <h2 className="text-lg font-bold text-slate-900">
              Vehicle Details
            </h2>
            <div className="mt-4 grid sm:grid-cols-2 gap-4">
              <select
                name="vehicleType"
                className="w-full border p-3 rounded-xl focus:ring-2 outline-none transition focus:ring-sky-500 border-slate-200 bg-white"
                value={formData.vehicleType}
                onChange={handleChange}
              >
                <option value="">Vehicle Type</option>
                <option value="bike">Bike</option>
                <option value="cycle">Cycle</option>
                <option value="scooter">Scooter</option>
              </select>
              <input
                type="text"
                name="vehicleNumber"
                placeholder="Vehicle Number"
                className="w-full border p-3 rounded-xl focus:ring-2 outline-none transition focus:ring-sky-500 border-slate-200"
                value={formData.vehicleNumber}
                onChange={handleChange}
              />
            </div>
          </section>

          <section className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6">
            <h2 className="text-lg font-bold text-slate-900">Work Details</h2>
            <div className="mt-4 grid sm:grid-cols-2 gap-4">
              <input
                type="text"
                name="deliveryCity"
                placeholder="Delivery Area / City"
                className="w-full border p-3 rounded-xl focus:ring-2 outline-none transition focus:ring-sky-500 border-slate-200"
                value={formData.deliveryCity}
                onChange={handleChange}
                required
              />
              <select
                name="availability"
                className="w-full border p-3 rounded-xl focus:ring-2 outline-none transition focus:ring-sky-500 border-slate-200 bg-white"
                value={formData.availability}
                onChange={handleChange}
                required
              >
                <option value="">Availability</option>
                <option value="full-time">Full-time</option>
                <option value="part-time">Part-time</option>
              </select>
              <input
                type="text"
                name="workingHours"
                placeholder="Working Hours (optional)"
                className="w-full border p-3 rounded-xl focus:ring-2 outline-none transition focus:ring-sky-500 border-slate-200"
                value={formData.workingHours}
                onChange={handleChange}
              />
            </div>
          </section>

          <section className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-8 w-1.5 bg-sky-600 rounded-full" />
              <h2 className="text-lg font-bold text-slate-900 uppercase tracking-tight">
                Account Security
              </h2>
            </div>
            <div className="mt-4 grid sm:grid-cols-2 gap-4">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                placeholder="Password"
                className="w-full border p-3.5 rounded-xl focus:ring-2 outline-none transition focus:ring-sky-500 border-slate-200 bg-slate-50/30 font-medium"
                value={formData.password}
                onChange={handleChange}
                required
              />
              <input
                type={showConfirmPassword ? "text" : "password"}
                name="confirmPassword"
                placeholder="Confirm Password"
                className="w-full border p-3.5 rounded-xl focus:ring-2 outline-none transition focus:ring-sky-500 border-slate-200 bg-slate-50/30 font-medium"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
              />
              <div className="flex gap-2 sm:col-span-2">
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold text-sky-700 transition border border-sky-200 hover:bg-sky-50 uppercase tracking-wider"
                >
                  {showPassword ? "Hide" : "Show"} Password
                </button>
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold text-sky-700 transition border border-sky-200 hover:bg-sky-50 uppercase tracking-wider"
                >
                  {showConfirmPassword ? "Hide" : "Show"} Confirm
                </button>
              </div>
              {!passwordsMatch && (
                <p className="text-rose-600 text-sm sm:col-span-2">
                  Passwords do not match.
                </p>
              )}
            </div>
          </section>

          <section className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6">
            <h2 className="text-lg font-bold text-slate-900">
              Optional System Data
            </h2>
            <div className="mt-4 grid sm:grid-cols-2 gap-4">
              <label className="flex items-center gap-3 text-slate-700">
                <input
                  type="checkbox"
                  name="liveLocationPermission"
                  checked={formData.liveLocationPermission}
                  onChange={handleCheckbox}
                  className="h-4 w-4"
                />
                Live Location Permission (for tracking)
              </label>
              <label className="flex items-center gap-3 text-slate-700">
                <input
                  type="checkbox"
                  name="createEarningsWallet"
                  checked={formData.createEarningsWallet}
                  onChange={handleCheckbox}
                  className="h-4 w-4"
                />
                Create Earnings Wallet
              </label>
            </div>
          </section>

          <button
            type="submit"
            className="w-full py-4 rounded-2xl font-bold text-white transition shadow-xl bg-sky-600 hover:bg-sky-700 disabled:opacity-50 uppercase tracking-widest text-sm shadow-sky-200 active:scale-[0.98]"
            disabled={loading}
          >
            {loading ? "Creating..." : "Create Account"}
          </button>
        </form>
      </div>

      {/* Photo Cropping Modal */}
      {showCropModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-900">Adjust Profile Photo</h3>
              <button onClick={cancelCrop} className="text-slate-400 hover:text-slate-600">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            
            <div className="p-8 flex flex-col items-center">
              {/* Preview Circle */}
              <div className="h-48 w-48 rounded-full border-4 border-white shadow-xl overflow-hidden bg-slate-100 relative mb-8">
                <img 
                  src={tempImage} 
                  alt="Adjusting"
                  className="absolute max-w-none transition-none"
                  style={{
                    width: cropParams.scale * 100 + '%',
                    height: 'auto',
                    left: `${cropParams.x}%`,
                    top: `${cropParams.y}%`,
                    transform: 'translate(-50%, -50%)',
                    minWidth: '100%',
                    minHeight: '100%'
                  }}
                />
                <div className="absolute inset-0 ring-inset ring-40px ring-black/5 pointer-events-none" />
              </div>

              {/* Controls */}
              <div className="w-full space-y-5">
                <div>
                  <div className="flex justify-between mb-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Zoom</label>
                    <span className="text-[10px] font-bold text-sky-600">{Math.round(cropParams.scale * 100)}%</span>
                  </div>
                  <input 
                    type="range" min="1" max="3" step="0.01" 
                    value={cropParams.scale} 
                    onChange={(e) => setCropParams(p => ({ ...p, scale: parseFloat(e.target.value) }))}
                    className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-sky-600"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2">Horizontal</label>
                    <input 
                      type="range" min="0" max="100" 
                      value={cropParams.x} 
                      onChange={(e) => setCropParams(p => ({ ...p, x: parseInt(e.target.value) }))}
                      className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-slate-400"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2">Vertical</label>
                    <input 
                      type="range" min="0" max="100" 
                      value={cropParams.y} 
                      onChange={(e) => setCropParams(p => ({ ...p, y: parseInt(e.target.value) }))}
                      className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-slate-400"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-3">
              <button
                type="button"
                onClick={cancelCrop}
                className="flex-1 py-3 rounded-xl font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={applyCrop}
                className="flex-1 py-3 rounded-xl font-bold text-white bg-sky-600 hover:bg-sky-700 shadow-lg shadow-sky-200 transition"
              >
                Apply Crop
              </button>
            </div>
          </div>
          {/* Hidden Canvas for processing */}
          <canvas ref={canvasRef} className="hidden" />
        </div>
      )}
    </div>
  );
}
