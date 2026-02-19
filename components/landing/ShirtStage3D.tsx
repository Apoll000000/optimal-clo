"use client";

import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Decal, Environment, useGLTF, useTexture } from "@react-three/drei";
import { MotionValue, useMotionValueEvent } from "framer-motion";
import { Suspense, useLayoutEffect, useMemo, useRef, useState } from "react";

type Props = {
    isDark?: boolean;
    designUrl?: string;
    printSide?: "front" | "back";

    scaleMv?: MotionValue<number>;
    yMv?: MotionValue<number>;
    rotateMv?: MotionValue<number>;

    chestMv?: MotionValue<number>;
    bottomLeftMv?: MotionValue<number>;
    backMv?: MotionValue<number>;
    backCenterMv?: MotionValue<number>;
    outroMv?: MotionValue<number>;
};

function normalizeScene(input: THREE.Object3D) {
    const root = input.clone(true);

    const box = new THREE.Box3().setFromObject(root);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);

    const maxAxis = Math.max(size.x, size.y, size.z) || 1;

    root.position.sub(center);
    root.scale.setScalar(1.25 / maxAxis);
    root.position.y -= 0.15;

    return root;
}

type MVState = {
    s: number;
    y: number;
    r: number;
    chest: number;
    bl: number;
    back: number;
    backC: number;
    out: number;
};

function ShirtModel({
    isDark,
    designUrl = "/designs/skull-headphones.png",
    printSide = "front",
    scaleMv,
    yMv,
    rotateMv,
    chestMv,
    bottomLeftMv,
    backMv,
    backCenterMv,
    outroMv,
}: Props) {
    const group = useRef<THREE.Group>(null);
    const { scene } = useGLTF("/models/oversized_t-shirt.glb");
    const normalized = useMemo(() => normalizeScene(scene), [scene]);

    const designTex = useTexture(designUrl) as THREE.Texture;

    const { viewport } = useThree();
    const aspect = viewport.width / viewport.height;
    const isPortrait = aspect < 1;

    const [mv, setMv] = useState<MVState>({
        s: 1,
        y: 0,
        r: 0,
        chest: 0,
        bl: 0,
        back: 0,
        backC: 0,
        out: 0,
    });

    const clamp01 = (v: number) => THREE.MathUtils.clamp(v, 0, 1);

    useMotionValueEvent(scaleMv as any, "change", (v) => typeof v === "number" && setMv((p) => ({ ...p, s: v })));
    useMotionValueEvent(yMv as any, "change", (v) => typeof v === "number" && setMv((p) => ({ ...p, y: v })));
    useMotionValueEvent(rotateMv as any, "change", (v) => typeof v === "number" && setMv((p) => ({ ...p, r: v })));

    useMotionValueEvent(chestMv as any, "change", (v) => typeof v === "number" && setMv((p) => ({ ...p, chest: clamp01(v) })));
    useMotionValueEvent(bottomLeftMv as any, "change", (v) => typeof v === "number" && setMv((p) => ({ ...p, bl: clamp01(v) })));
    useMotionValueEvent(backMv as any, "change", (v) => typeof v === "number" && setMv((p) => ({ ...p, back: clamp01(v) })));
    useMotionValueEvent(backCenterMv as any, "change", (v) => typeof v === "number" && setMv((p) => ({ ...p, backC: clamp01(v) })));
    useMotionValueEvent(outroMv as any, "change", (v) => typeof v === "number" && setMv((p) => ({ ...p, out: clamp01(v) })));

    // texture setup
    useLayoutEffect(() => {
        designTex.colorSpace = THREE.SRGBColorSpace;
        designTex.anisotropy = 8;
        designTex.flipY = false;
        designTex.needsUpdate = true;
    }, [designTex]);

    // apply shirt base color (array-safe)
    useLayoutEffect(() => {
        normalized.traverse((obj) => {
            if (!(obj instanceof THREE.Mesh)) return;

            const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
            mats.forEach((m: any) => {
                if (!m) return;
                if ("roughness" in m) m.roughness = 0.9;
                if ("metalness" in m) m.metalness = 0.03;
                if (m.color) m.color.set(isDark ? "#450A0A" : "#F2F0F0");
                m.needsUpdate = true;
            });
        });
    }, [normalized, isDark]);

    // ✅ collect meshes WITH matrixWorld (fixes “nawala” issue)
    const { meshes, bodyUuid } = useMemo(() => {
        normalized.updateMatrixWorld(true);

        const list: { uuid: string; geometry: THREE.BufferGeometry; material: any; matrixWorld: THREE.Matrix4 }[] = [];

        normalized.traverse((o) => {
            if (!(o instanceof THREE.Mesh)) return;
            list.push({
                uuid: o.uuid,
                geometry: o.geometry,
                material: o.material,
                matrixWorld: o.matrixWorld.clone(),
            });
        });

        // pick body as largest bounding-box volume
        let bestUuid = "";
        let bestScore = -Infinity;

        for (const m of list) {
            m.geometry.computeBoundingBox();
            const bb = m.geometry.boundingBox;
            if (!bb) continue;
            const s = new THREE.Vector3();
            bb.getSize(s);
            const volume = s.x * s.y * s.z;
            if (volume > bestScore) {
                bestScore = volume;
                bestUuid = m.uuid;
            }
        }

        return { meshes: list, bodyUuid: bestUuid };
    }, [normalized]);

    // animation
    useFrame((state) => {
        if (!group.current) return;

        const t = state.clock.getElapsedTime();

        const baseR = THREE.MathUtils.degToRad(THREE.MathUtils.clamp(mv.r, -12, 12));
        const baseS = THREE.MathUtils.clamp(mv.s, 0.9, 1.35);
        const baseY = THREE.MathUtils.clamp(mv.y, 0, 90);

        const baseRotY = baseR + Math.sin(t * 0.55) * 0.05;
        const baseRotX = Math.sin(t * 0.4) * 0.025;

        let px = 0;
        let py = -0.75 + baseY * 0.0016;
        let ry = baseRotY;
        let rx = baseRotX;
        let sc = baseS;

        const lerp = (a: number, b: number, tt: number) => a + (b - a) * tt;

        // chest
        px = lerp(px, isPortrait ? -0.01 : 0.2, mv.chest);
        py = lerp(py, isPortrait ? -1.0 : -1.95, mv.chest);
        sc = lerp(sc, isPortrait ? 1.2 : 2.05, mv.chest);
        ry = lerp(ry, baseRotY - 0.78, mv.chest);
        rx = lerp(rx, baseRotX - 0.04, mv.chest);

        // bottom-left
        px = lerp(px, isPortrait ? 0.1 : 0.35, mv.bl);
        py = lerp(py, isPortrait ? -2.15 : -0.95, mv.bl);
        sc = lerp(sc, isPortrait ? 1.45 : 2.25, mv.bl);
        ry = lerp(ry, baseRotY + 0.55, mv.bl);
        rx = lerp(rx, baseRotX + 0.08, mv.bl);

        // back
        px = lerp(px, isPortrait ? 0.05 : 0.4, mv.back);
        py = lerp(py, isPortrait ? -1.1 : -1.05, mv.back);
        sc = lerp(sc, isPortrait ? 1.05 : 1.18, mv.back);
        ry = lerp(ry, baseRotY + Math.PI + 0.5, mv.back);
        rx = lerp(rx, 0, mv.back);

        // back center
        px = lerp(px, isPortrait ? 0.05 : 0.4, mv.backC);
        py = lerp(py, isPortrait ? -1.1 : -1.45, mv.backC);
        sc = lerp(sc, isPortrait ? 1.05 : 1.58, mv.backC);
        ry = lerp(ry, baseRotY + Math.PI + 0.5, mv.backC);
        rx = lerp(rx, 0, mv.backC);

        // outro
        px = lerp(px, isPortrait ? 0.06 : 0.34, mv.out);
        py = lerp(py, isPortrait ? -1.1 : -0.8, mv.out);
        sc = lerp(sc, baseS - 0.08, mv.out);
        ry = lerp(ry, baseRotY + 0.1, mv.out);
        rx = lerp(rx, baseRotX, mv.out);

        group.current.position.set(px, py, 0);
        group.current.rotation.set(rx, ry, 0);
        group.current.scale.setScalar(sc);
    });

    return (
        <group ref={group}>
            {meshes.map((m) => {
                const isBody = m.uuid === bodyUuid;

                return (
                    <mesh
                        key={m.uuid}
                        geometry={m.geometry}
                        material={m.material}
                        matrix={m.matrixWorld}
                        matrixAutoUpdate={false}
                        castShadow
                        receiveShadow
                    >
                        {isBody && (
                            <>
                                {printSide === "front" && (
                                    <Decal position={[0.0, 0.08, 0.75]} rotation={[0, 0, 0]} scale={1.65}>
                                        <meshStandardMaterial
                                            map={designTex}
                                            transparent
                                            depthTest
                                            depthWrite={false}
                                            polygonOffset
                                            polygonOffsetFactor={-4}
                                        />
                                    </Decal>
                                )}

                                {printSide === "back" && (
                                    <Decal position={[0.0, 0.08, 0.75]} rotation={[0, 0, 0]} scale={1.65}>
                                        <meshStandardMaterial
                                            map={designTex}
                                            transparent
                                            depthTest
                                            depthWrite={false}
                                            polygonOffset
                                            polygonOffsetFactor={-4}
                                        />
                                    </Decal>
                                )}
                            </>
                        )}
                    </mesh>
                );
            })}
        </group>
    );
}

export default function ShirtStage3D(props: Props) {
    return (
        <Canvas
            dpr={[1, 1.75]}
            camera={{ position: [0, 0.05, 2.55], fov: 34, near: 0.1, far: 100 }}
            gl={{ antialias: true, alpha: true }}
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
        >
            <ambientLight intensity={0.75} />
            <directionalLight position={[3, 5, 2]} intensity={1.15} />
            <directionalLight position={[-3, 2, 2]} intensity={0.55} />

            <Suspense fallback={null}>
                <Environment preset="studio" />
                <ShirtModel {...props} />
            </Suspense>
        </Canvas>
    );
}

useGLTF.preload("/models/oversized_t-shirt.glb");
