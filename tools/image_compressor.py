"""
Simple batch image compressor with a Tkinter interface.

It keeps the original resolution, removes metadata, and saves compressed copies
inside an output folder. File names are preserved.
"""

from __future__ import annotations

import queue
import threading
from dataclasses import dataclass
from pathlib import Path
from tkinter import BooleanVar, DoubleVar, IntVar, StringVar, Tk, filedialog, messagebox, ttk

try:
    from PIL import Image, ImageOps
except ImportError:  # pragma: no cover - shown to the user at runtime.
    Image = None
    ImageOps = None


SUPPORTED_EXTENSIONS = {
    ".jpg",
    ".jpeg",
    ".png",
    ".webp",
    ".bmp",
    ".tif",
    ".tiff",
}


@dataclass
class CompressionResult:
    source: Path
    output: Path | None
    original_size: int
    compressed_size: int
    error: str | None = None


def format_size(size_in_bytes: int) -> str:
    """Return a human-friendly file size."""
    units = ("B", "KB", "MB", "GB")
    size = float(size_in_bytes)
    for unit in units:
        if size < 1024 or unit == units[-1]:
            return f"{size:.1f} {unit}" if unit != "B" else f"{int(size)} {unit}"
        size /= 1024
    return f"{size_in_bytes} B"


def ensure_rgb(image: Image.Image) -> Image.Image:
    """Convert formats with alpha or palette data to a JPEG/WebP friendly mode."""
    if image.mode in ("RGBA", "LA"):
        background = Image.new("RGB", image.size, (255, 255, 255))
        background.paste(image, mask=image.getchannel("A"))
        return background
    if image.mode == "P":
        return image.convert("RGB")
    return image.convert("RGB")


def compress_image(
    source: Path,
    output_folder: Path,
    jpeg_quality: int,
    webp_quality: int,
    quantize_png: bool,
) -> CompressionResult:
    """Compress one image without changing its pixel dimensions."""
    output_folder.mkdir(parents=True, exist_ok=True)
    output = output_folder / source.name
    original_size = source.stat().st_size

    try:
        with Image.open(source) as opened_image:
            image = ImageOps.exif_transpose(opened_image)
            extension = source.suffix.lower()

            if extension in (".jpg", ".jpeg"):
                image = ensure_rgb(image)
                image.save(
                    output,
                    format="JPEG",
                    quality=jpeg_quality,
                    optimize=True,
                    progressive=True,
                )
            elif extension == ".webp":
                image.save(
                    output,
                    format="WEBP",
                    quality=webp_quality,
                    method=6,
                )
            elif extension == ".png":
                png_image = image
                if quantize_png and image.mode not in ("1", "L", "P"):
                    png_image = image.convert("P", palette=Image.Palette.ADAPTIVE, colors=256)
                png_image.save(output, format="PNG", optimize=True, compress_level=9)
            else:
                save_format = image.format or extension.replace(".", "").upper()
                image.save(output, format=save_format, optimize=True)

        compressed_size = output.stat().st_size
        if compressed_size > original_size:
            output.write_bytes(source.read_bytes())
            compressed_size = original_size

        return CompressionResult(source, output, original_size, compressed_size)
    except Exception as exc:
        return CompressionResult(source, None, original_size, 0, str(exc))


class ImageCompressorApp:
    """Tkinter application that lets the user select and compress many images."""

    def __init__(self, root: Tk) -> None:
        self.root = root
        self.root.title("Compressor de imagens")
        self.root.geometry("820x560")
        self.root.minsize(720, 480)

        self.files: list[Path] = []
        self.events: queue.Queue[tuple[str, object]] = queue.Queue()

        self.output_folder = StringVar(value=str(Path.cwd() / "comprimidos"))
        self.jpeg_quality = IntVar(value=76)
        self.webp_quality = IntVar(value=76)
        self.quantize_png = BooleanVar(value=False)
        self.progress_value = DoubleVar(value=0)
        self.status_text = StringVar(value="Selecione imagens para comprimir.")

        self.build_layout()
        self.root.after(100, self.consume_events)

    def build_layout(self) -> None:
        """Create all interface controls."""
        frame = ttk.Frame(self.root, padding=16)
        frame.pack(fill="both", expand=True)
        frame.columnconfigure(0, weight=1)
        frame.rowconfigure(4, weight=1)

        actions = ttk.Frame(frame)
        actions.grid(row=0, column=0, sticky="ew")
        actions.columnconfigure(3, weight=1)

        ttk.Button(actions, text="Adicionar imagens", command=self.select_files).grid(row=0, column=0, padx=(0, 8))
        ttk.Button(actions, text="Limpar lista", command=self.clear_files).grid(row=0, column=1, padx=(0, 8))
        ttk.Button(actions, text="Comprimir", command=self.start_compression).grid(row=0, column=2, padx=(0, 8))

        output_frame = ttk.LabelFrame(frame, text="Pasta de saida", padding=10)
        output_frame.grid(row=1, column=0, sticky="ew", pady=(14, 8))
        output_frame.columnconfigure(0, weight=1)
        ttk.Entry(output_frame, textvariable=self.output_folder).grid(row=0, column=0, sticky="ew", padx=(0, 8))
        ttk.Button(output_frame, text="Escolher", command=self.select_output_folder).grid(row=0, column=1)

        settings = ttk.LabelFrame(frame, text="Compressao", padding=10)
        settings.grid(row=2, column=0, sticky="ew", pady=(0, 8))
        settings.columnconfigure(1, weight=1)
        settings.columnconfigure(3, weight=1)

        ttk.Label(settings, text="Qualidade JPG").grid(row=0, column=0, sticky="w", padx=(0, 8))
        ttk.Scale(settings, from_=35, to=95, variable=self.jpeg_quality, orient="horizontal").grid(
            row=0, column=1, sticky="ew", padx=(0, 18)
        )
        ttk.Label(settings, textvariable=self.jpeg_quality).grid(row=0, column=2, sticky="w", padx=(0, 18))

        ttk.Label(settings, text="Qualidade WebP").grid(row=0, column=3, sticky="w", padx=(0, 8))
        ttk.Scale(settings, from_=35, to=95, variable=self.webp_quality, orient="horizontal").grid(
            row=0, column=4, sticky="ew", padx=(0, 8)
        )
        ttk.Label(settings, textvariable=self.webp_quality).grid(row=0, column=5, sticky="w")

        ttk.Checkbutton(
            settings,
            text="Reduzir PNG com paleta de 256 cores",
            variable=self.quantize_png,
        ).grid(row=1, column=0, columnspan=6, sticky="w", pady=(10, 0))

        ttk.Label(frame, textvariable=self.status_text).grid(row=3, column=0, sticky="w", pady=(4, 6))

        self.file_list = ttk.Treeview(frame, columns=("path",), show="headings", selectmode="extended")
        self.file_list.heading("path", text="Arquivos selecionados")
        self.file_list.grid(row=4, column=0, sticky="nsew")

        scrollbar = ttk.Scrollbar(frame, orient="vertical", command=self.file_list.yview)
        scrollbar.grid(row=4, column=1, sticky="ns")
        self.file_list.configure(yscrollcommand=scrollbar.set)

        self.progress = ttk.Progressbar(frame, variable=self.progress_value, maximum=100)
        self.progress.grid(row=5, column=0, sticky="ew", pady=(12, 0))

        self.log = ttk.Treeview(frame, columns=("file", "before", "after", "saving"), show="headings", height=6)
        self.log.heading("file", text="Arquivo")
        self.log.heading("before", text="Antes")
        self.log.heading("after", text="Depois")
        self.log.heading("saving", text="Reducao")
        self.log.column("file", width=360)
        self.log.column("before", width=90, anchor="e")
        self.log.column("after", width=90, anchor="e")
        self.log.column("saving", width=90, anchor="e")
        self.log.grid(row=6, column=0, sticky="ew", pady=(12, 0))

    def select_files(self) -> None:
        """Add selected image files to the batch list."""
        selected = filedialog.askopenfilenames(
            title="Escolha as imagens",
            filetypes=[
                ("Imagens", "*.jpg *.jpeg *.png *.webp *.bmp *.tif *.tiff"),
                ("Todos os arquivos", "*.*"),
            ],
        )
        existing = set(self.files)
        for file_name in selected:
            path = Path(file_name)
            if path.suffix.lower() in SUPPORTED_EXTENSIONS and path not in existing:
                self.files.append(path)
                existing.add(path)
                self.file_list.insert("", "end", values=(str(path),))
        self.status_text.set(f"{len(self.files)} imagem(ns) selecionada(s).")

    def select_output_folder(self) -> None:
        """Let the user choose where compressed images will be saved."""
        folder = filedialog.askdirectory(title="Escolha a pasta de saida")
        if folder:
            self.output_folder.set(folder)

    def clear_files(self) -> None:
        """Clear selected files and previous logs."""
        self.files.clear()
        for item in self.file_list.get_children():
            self.file_list.delete(item)
        for item in self.log.get_children():
            self.log.delete(item)
        self.progress_value.set(0)
        self.status_text.set("Lista limpa.")

    def start_compression(self) -> None:
        """Start compression in a background thread so the interface stays responsive."""
        if Image is None or ImageOps is None:
            messagebox.showerror(
                "Pillow nao encontrado",
                "Instale a dependencia com:\n\npython -m pip install Pillow",
            )
            return

        if not self.files:
            messagebox.showwarning("Nenhuma imagem", "Adicione pelo menos uma imagem antes de comprimir.")
            return

        output_folder = Path(self.output_folder.get()).expanduser()
        for item in self.log.get_children():
            self.log.delete(item)
        self.progress_value.set(0)
        self.status_text.set("Comprimindo imagens...")

        worker = threading.Thread(
            target=self.compress_batch,
            args=(output_folder,),
            daemon=True,
        )
        worker.start()

    def compress_batch(self, output_folder: Path) -> None:
        """Compress all selected files and send progress events to the UI thread."""
        total = len(self.files)
        for index, source in enumerate(self.files, start=1):
            result = compress_image(
                source,
                output_folder,
                int(self.jpeg_quality.get()),
                int(self.webp_quality.get()),
                bool(self.quantize_png.get()),
            )
            self.events.put(("result", result))
            self.events.put(("progress", index / total * 100))
        self.events.put(("done", output_folder))

    def consume_events(self) -> None:
        """Read background-thread events and update the interface safely."""
        while True:
            try:
                event, payload = self.events.get_nowait()
            except queue.Empty:
                break

            if event == "result":
                result = payload
                self.add_result(result)
            elif event == "progress":
                self.progress_value.set(float(payload))
            elif event == "done":
                self.status_text.set(f"Finalizado. Arquivos salvos em: {payload}")
                messagebox.showinfo("Compressao finalizada", f"Arquivos comprimidos em:\n{payload}")

        self.root.after(100, self.consume_events)

    def add_result(self, result: CompressionResult) -> None:
        """Insert one compression result in the log table."""
        if result.error:
            self.log.insert("", "end", values=(result.source.name, "erro", "-", result.error))
            return

        saving = result.original_size - result.compressed_size
        saving_percent = saving / result.original_size * 100 if result.original_size else 0
        self.log.insert(
            "",
            "end",
            values=(
                result.source.name,
                format_size(result.original_size),
                format_size(result.compressed_size),
                f"{saving_percent:.1f}%",
            ),
        )


def main() -> None:
    """Open the image compressor interface."""
    root = Tk()
    ImageCompressorApp(root)
    root.mainloop()


if __name__ == "__main__":
    main()
