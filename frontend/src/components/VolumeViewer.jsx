import { useEffect, useRef, useState } from "react";
import { Niivue } from "@niivue/niivue";

const BASE = "https://niivue.github.io/niivue-demo-images/";
const DATASETS = [
  { label: "MNI152 (cerveau standard)", url: BASE + "mni152.nii.gz" },
  { label: "T1 (démo NiiVue)", url: BASE + "chris_t1.nii.gz" },
  { label: "T2 (démo NiiVue)", url: BASE + "chris_t2.nii.gz" },
];
const COLORMAPS = ["gray", "viridis", "plasma", "inferno", "hot", "winter", "warm"];
const MASK_COLORS = ["red", "green", "blue", "warm", "hot"];
const VIEWS = [
  { label: "Multiplanaire", key: "sliceTypeMultiplanar" },
  { label: "3D", key: "sliceTypeRender" },
  { label: "Axiale", key: "sliceTypeAxial" },
  { label: "Coronale", key: "sliceTypeCoronal" },
  { label: "Sagittale", key: "sliceTypeSagittal" },
];
const PENS = [
  { label: "Tumeur (rouge)", value: 1 },
  { label: "Œdème (vert)", value: 2 },
  { label: "Zone (bleu)", value: 3 },
  { label: "Gomme", value: 0 },
];

export default function VolumeViewer() {
  const canvasRef = useRef(null);
  const nvRef = useRef(null);
  const maskRef = useRef(null);

  const [status, setStatus] = useState("Initialisation...");
  const [ready, setReady] = useState(false);
  const [info, setInfo] = useState({ name: "—", dims: "—" });
  const [location, setLocation] = useState("Clique sur l'image");

  const [url, setUrl] = useState(DATASETS[0].url);
  const [colormap, setColormap] = useState("gray");
  const [view, setView] = useState("sliceTypeMultiplanar");

  const [maskColor, setMaskColor] = useState("red");
  const [maskOpacity, setMaskOpacity] = useState(0.7);
  const [hasMask, setHasMask] = useState(false);

  const [drawOn, setDrawOn] = useState(false);
  const [pen, setPen] = useState(1);

  const [clipOn, setClipOn] = useState(false);
  const [clipDepth, setClipDepth] = useState(0);

  // Création du viewer
  useEffect(() => {
    const nv = new Niivue({
      backColor: [0.03, 0.05, 0.1, 1],
      show3Dcrosshair: true,
      dragAndDropEnabled: false,
    });
    nvRef.current = nv;
    nv.attachToCanvas(canvasRef.current);
    nv.setSliceType(nv.sliceTypeMultiplanar);
    nv.onLocationChange = (d) => setLocation(d.string);
    loadBase(DATASETS[0].url, "mni152.nii.gz");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadBase(src, name) {
    const nv = nvRef.current;
    try {
      setStatus("Chargement du volume...");
      maskRef.current = null;
      setHasMask(false);
      await nv.loadVolumes([{ url: src, name, colormap }]);
      const d = nv.volumes[0].dims;
      setInfo({ name, dims: `${d[1]} × ${d[2]} × ${d[3]}` });
      setStatus("Volume chargé");
      setReady(true);
    } catch (e) {
      console.error(e);
      setStatus("Erreur : fichier illisible ou lien bloqué (CORS)");
    }
  }

  async function onBaseFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    const blob = URL.createObjectURL(file);
    await loadBase(blob, file.name);
    URL.revokeObjectURL(blob);
    e.target.value = "";
  }

  async function onMaskFile(e) {
    const file = e.target.files[0];
    const nv = nvRef.current;
    if (!file || !ready) return;
    try {
      if (maskRef.current) nv.removeVolume(maskRef.current);
      const blob = URL.createObjectURL(file);
      maskRef.current = await nv.addVolumeFromUrl({
        url: blob,
        name: file.name,
        colormap: maskColor,
        opacity: maskOpacity,
      });
      URL.revokeObjectURL(blob);
      setHasMask(true);
      setStatus("Masque de tumeur affiché");
    } catch (err) {
      console.error(err);
      setStatus("Erreur : masque illisible");
    }
    e.target.value = "";
  }

  // Palette de l'IRM
  useEffect(() => {
    const nv = nvRef.current;
    if (ready && nv.volumes[0]) nv.setColormap(nv.volumes[0].id, colormap);
  }, [colormap, ready]);

  // Type de vue
  useEffect(() => {
    const nv = nvRef.current;
    if (nv) nv.setSliceType(nv[view]);
  }, [view]);

  // Couleur et opacité du masque
  useEffect(() => {
    const nv = nvRef.current;
    if (!hasMask || !maskRef.current) return;
    nv.setColormap(maskRef.current.id, maskColor);
    nv.setOpacity(nv.volumes.indexOf(maskRef.current), maskOpacity);
  }, [maskColor, maskOpacity, hasMask]);

  // Annotation manuelle
  useEffect(() => {
    const nv = nvRef.current;
    if (!ready) return;
    nv.setDrawingEnabled(drawOn);
    if (drawOn) {
      nv.setPenValue(pen, true);
      nv.setDrawOpacity(0.7);
    }
  }, [drawOn, pen, ready]);

  // Plan de coupe 3D
  useEffect(() => {
    const nv = nvRef.current;
    if (!ready) return;
    nv.setClipPlane(clipOn ? [clipDepth, 270, 0] : [2, 0, 0]);
  }, [clipOn, clipDepth, ready]);

  function saveAnnotation() {
    try {
      nvRef.current.saveImage({ filename: "annotation-tumeur.nii", isSaveDrawing: true });
    } catch (e) {
      console.error(e);
      setStatus("Export impossible avec cette version de NiiVue");
    }
  }

  return (
    <div className="workspace">
      <aside className="panel">
        <h2>Volume IRM</h2>

        <label className="file-btn">
          📂 Importer mon IRM (.nii / .nii.gz)
          <input type="file" accept=".nii,.gz" onChange={onBaseFile} hidden />
        </label>

        <label className="field">Dataset de démo</label>
        <select
          value={url}
          onChange={(e) => {
            setUrl(e.target.value);
            const d = DATASETS.find((x) => x.url === e.target.value);
            loadBase(d.url, d.label);
          }}
        >
          {DATASETS.map((d) => (
            <option key={d.url} value={d.url}>{d.label}</option>
          ))}
        </select>

        <label className="field">Ou coller un lien</label>
        <div className="row">
          <input
            type="text"
            placeholder="https://.../image.nii.gz"
            onKeyDown={(e) => {
              if (e.key === "Enter" && e.target.value) {
                const link = e.target.value;
                loadBase(link, link.split("/").pop());
              }
            }}
          />
        </div>
        <small>Appuie sur Entrée. Le lien doit autoriser le CORS.</small>

        <div className="info">
          <p><b>Fichier :</b> {info.name}</p>
          <p><b>Dimensions :</b> {info.dims}</p>
          <p><b>Position :</b> {location}</p>
          <p className="status">{status}</p>
        </div>

        <h2>Affichage</h2>
        <label className="field">Vue</label>
        <div className="chips">
          {VIEWS.map((v) => (
            <button
              key={v.key}
              className={view === v.key ? "chip active" : "chip"}
              onClick={() => setView(v.key)}
            >
              {v.label}
            </button>
          ))}
        </div>

        <label className="field">Palette de couleurs de l'IRM</label>
        <select value={colormap} onChange={(e) => setColormap(e.target.value)}>
          {COLORMAPS.map((c) => <option key={c}>{c}</option>)}
        </select>

        <label className="check">
          <input type="checkbox" checked={clipOn} onChange={(e) => setClipOn(e.target.checked)} />
          Plan de coupe 3D
        </label>
        {clipOn && (
          <input
            type="range" min="-0.5" max="0.5" step="0.01"
            value={clipDepth}
            onChange={(e) => setClipDepth(parseFloat(e.target.value))}
          />
        )}

        <h2>Tumeur</h2>
        <label className="file-btn alt">
          🎯 Importer un masque de tumeur
          <input type="file" accept=".nii,.gz" onChange={onMaskFile} hidden />
        </label>

        <label className="field">Couleur du masque</label>
        <select value={maskColor} onChange={(e) => setMaskColor(e.target.value)}>
          {MASK_COLORS.map((c) => <option key={c}>{c}</option>)}
        </select>

        <label className="field">Opacité : {Math.round(maskOpacity * 100)} %</label>
        <input
          type="range" min="0" max="1" step="0.05"
          value={maskOpacity}
          onChange={(e) => setMaskOpacity(parseFloat(e.target.value))}
        />

        <label className="check">
          <input type="checkbox" checked={drawOn} onChange={(e) => setDrawOn(e.target.checked)} />
          Dessiner / annoter la tumeur
        </label>
        {drawOn && (
          <>
            <div className="chips">
              {PENS.map((p) => (
                <button
                  key={p.value}
                  className={pen === p.value ? "chip active" : "chip"}
                  onClick={() => setPen(p.value)}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <div className="row">
              <button className="chip" onClick={() => nvRef.current.drawUndo()}>↶ Annuler</button>
              <button className="chip" onClick={saveAnnotation}>💾 Exporter</button>
            </div>
            <small>Décoche le dessin pour faire tourner la vue 3D à la souris.</small>
          </>
        )}

        <p className="disclaimer">
          Outil de visualisation et de recherche : il ne remplace pas un diagnostic médical.
        </p>
      </aside>

      <section className="canvas-wrap">
        <canvas ref={canvasRef} />
      </section>
    </div>
  );
}