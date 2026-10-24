"""Background removal for `npm run cutout` (scripts/cutout.mjs runs this with the kit's .venv-cutout Python).

rembg (MIT) + a named model (default BiRefNet, MIT). Forced to the CPU: on macOS rembg also enables Apple's CoreML
provider, which hangs with no error (Day-8 kit upgrade finding). CPU is fast enough (~1-20 s per image).
  python scripts/cutout.py <model> <out> <in> [<in> ...]   (out = a .png path for one input, else a folder)
"""
import os, sys, time, warnings
from pathlib import Path

# One shared copy of the model for every project: rembg reads/downloads it here (default would be ~/.u2net)
os.environ.setdefault("U2NET_HOME", str(Path.home() / ".cache" / "showreel-models"))
Path(os.environ["U2NET_HOME"]).mkdir(parents=True, exist_ok=True)

warnings.filterwarnings("ignore")
from PIL import Image  # noqa: E402
from rembg import new_session, remove  # noqa: E402

model, out, *inputs = sys.argv[1:]
session = new_session(model, providers=["CPUExecutionProvider"])
many = len(inputs) > 1 or not out.lower().endswith(".png")
if many:
    Path(out).mkdir(parents=True, exist_ok=True)
for f in inputs:
    t = time.time()
    dst = Path(out) / (Path(f).stem + ".png") if many else Path(out)
    remove(Image.open(f), session=session).save(dst)
    print(f"  {Path(f).name} → {dst} ({time.time() - t:.1f} s)", flush=True)
