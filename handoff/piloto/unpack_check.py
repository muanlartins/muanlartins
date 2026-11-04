# Unzip each voice safely (no absolute or ".." paths) and list every Python global its .pth pickle references,
# reading opcodes with pickletools: nothing in the file is executed.
import sys, zipfile, pickletools, pathlib
SAFE = {"collections.OrderedDict", "torch.HalfStorage", "torch.FloatStorage", "torch._utils._rebuild_tensor_v2"}
for d in map(pathlib.Path, sys.argv[1:]):
    z = zipfile.ZipFile(d / "model.zip")
    for n in z.namelist():
        p = pathlib.PurePosixPath(n)
        if p.is_absolute() or ".." in p.parts:
            sys.exit(f"{d.name}: unsafe path {n}")
    z.extractall(d / "x")
    pths = list((d / "x").rglob("*.pth"))
    idx = list((d / "x").rglob("*.index"))
    for pth in pths:
        inner = zipfile.ZipFile(pth)
        pkl = next(n for n in inner.namelist() if n.endswith("data.pkl"))
        globs, strs = set(), []
        for op, arg, _ in pickletools.genops(inner.read(pkl)):
            if op.name in ("SHORT_BINUNICODE", "BINUNICODE", "UNICODE"):
                strs.append(arg)
            elif op.name == "STACK_GLOBAL":
                globs.add(f"{strs[-2]}.{strs[-1]}")
            elif op.name == "GLOBAL":
                globs.add(arg.replace(" ", "."))
        bad = globs - SAFE
        print(f"{d.name}: {pth.relative_to(d)} | index: {[str(i.relative_to(d)) for i in idx]} | globals: {sorted(globs)} | {'UNSAFE ' + str(bad) if bad else 'ok'}")
