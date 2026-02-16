from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import List, Optional, Tuple, Dict, Any

import cv2
import numpy as np

from board.charuco_spec import CharucoSpec
from calib.charuco_detector import CharucoCornerExtractor
from calib.calib_io import save_intrinsics_left, save_intrinsics_right, save_intrinsics_stereo, save_stereo_params, save_rectify_maps
from calib.charuco_defaults import charuco_spec_dict
from diagnostics.intrinsics_check import print_intrinsics_sanity
from diagnostics.map_check import print_map_oob


@dataclass
class StereoCalibResult:
    image_size: Tuple[int, int]

    K_left: np.ndarray
    dist_left: np.ndarray
    rms_left: float

    K_right: np.ndarray
    dist_right: np.ndarray
    rms_right: float

    R: np.ndarray
    T: np.ndarray
    E: np.ndarray
    F: np.ndarray
    rms_stereo: float

    R1: np.ndarray
    R2: np.ndarray
    P1: np.ndarray
    P2: np.ndarray
    Q: np.ndarray
    mapLx: np.ndarray
    mapLy: np.ndarray
    mapRx: np.ndarray
    mapRy: np.ndarray


class StereoCharucoCalibrator:
    def __init__(self, spec: CharucoSpec):
        self.spec = spec
        self.extractor = CharucoCornerExtractor(spec)
        _, self.board = spec.build()
        self.board_obj_points = self.board.getChessboardCorners()
        # Pre-compute charuco spec dict for output
        self.charuco_spec = charuco_spec_dict(
            squares_x=spec.squares_x,
            squares_y=spec.squares_y,
            square_mm=spec.square_length_mm,
            marker_mm=spec.marker_length_mm,
            dictionary=spec.dictionary_name,
            legacy_pattern=spec.legacy_pattern,
        )

    @staticmethod
    def _list_images(folder: str | Path) -> List[Path]:
        folder = Path(folder)
        exts = ("*.png", "*.jpg", "*.jpeg", "*.bmp")
        files: List[Path] = []
        for e in exts:
            files.extend(folder.glob(e))
        return sorted(files)

    def calibrate_from_folders(
        self,
        left_dir: str | Path,
        right_dir: str | Path,
        out_dir: str | Path,
        min_charuco_corners: int = 10,
        min_common_ids: int = 10,
        alpha: float = 0.25,
        diagnostics: bool = True,
        zero_disparity: bool = True,
        rectify_flags: int | None = None,
    ) -> StereoCalibResult:
        left_imgs = self._list_images(left_dir)
        right_imgs = self._list_images(right_dir)
        if len(left_imgs) != len(right_imgs):
            raise ValueError(
                f"Mismatched image counts between left/right folders: {len(left_imgs)} vs {len(right_imgs)}"
            )

        all_corners_L, all_ids_L = [], []
        all_corners_R, all_ids_R = [], []

        st_objpoints, st_imgpointsL, st_imgpointsR = [], [], []
        image_size: Optional[Tuple[int, int]] = None

        for pL, pR in zip(left_imgs, right_imgs):
            imgL = cv2.imread(str(pL))
            imgR = cv2.imread(str(pR))
            if imgL is None or imgR is None:
                continue

            grayL = cv2.cvtColor(imgL, cv2.COLOR_BGR2GRAY)
            grayR = cv2.cvtColor(imgR, cv2.COLOR_BGR2GRAY)
            if image_size is None:
                image_size = (grayL.shape[1], grayL.shape[0])

            cornersL, idsL = self.extractor.detect(grayL)
            cornersR, idsR = self.extractor.detect(grayR)

            if idsL is not None and len(idsL) >= min_charuco_corners:
                all_corners_L.append(cornersL)
                all_ids_L.append(idsL)

            if idsR is not None and len(idsR) >= min_charuco_corners:
                all_corners_R.append(cornersR)
                all_ids_R.append(idsR)

            if idsL is None or idsR is None:
                continue

            idsL_f = idsL.flatten()
            idsR_f = idsR.flatten()
            common = np.intersect1d(idsL_f, idsR_f)
            if len(common) < min_common_ids:
                continue

            objp, imgpL, imgpR = [], [], []
            for cid in common:
                idxL = int(np.where(idsL_f == cid)[0][0])
                idxR = int(np.where(idsR_f == cid)[0][0])
                objp.append(self.board_obj_points[cid])
                imgpL.append(cornersL[idxL][0])
                imgpR.append(cornersR[idxR][0])

            st_objpoints.append(np.array(objp, dtype=np.float32))
            st_imgpointsL.append(np.array(imgpL, dtype=np.float32))
            st_imgpointsR.append(np.array(imgpR, dtype=np.float32))

        if image_size is None:
            raise RuntimeError("No valid images for stereo calibration.")

        if len(all_corners_L) < 8 or len(all_corners_R) < 8:
            raise RuntimeError(
                f"Not enough valid images: L={len(all_corners_L)} R={len(all_corners_R)} (need >=15-20)"
            )

        if len(st_objpoints) < 8:
            raise RuntimeError(
                f"Not enough stereo matches: {len(st_objpoints)} (need >=15-20)"
            )

        aruco = cv2.aruco

        def _calibrate_charuco(charuco_corners, charuco_ids):
            # Flags to fix higher-order distortion coefficients to zero
            flags = cv2.CALIB_FIX_K3 | cv2.CALIB_FIX_K4 | cv2.CALIB_FIX_K5 | cv2.CALIB_FIX_K6

            if hasattr(aruco, "calibrateCameraCharucoExtended"):
                rms, K, dist, *_ = aruco.calibrateCameraCharucoExtended(
                    charucoCorners=charuco_corners,
                    charucoIds=charuco_ids,
                    board=self.board,
                    imageSize=image_size,
                    cameraMatrix=None,
                    distCoeffs=None,
                    flags=flags,
                )
                return rms, K, dist

            if hasattr(aruco, "calibrateCameraCharuco"):
                out = aruco.calibrateCameraCharuco(
                    charuco_corners,
                    charuco_ids,
                    self.board,
                    image_size,
                    None,
                    None,
                    flags=flags,
                )
                rms, K, dist = out[0], out[1], out[2]
                return rms, K, dist

            objpoints, imgpoints = [], []
            board_obj = np.asarray(self.board_obj_points, dtype=np.float32)
            max_id = int(board_obj.shape[0]) - 1

            for corners, ids in zip(charuco_corners, charuco_ids):
                if corners is None or ids is None:
                    continue
                ids_1d = np.asarray(ids, dtype=np.int32).reshape(-1)
                corners_2d = np.asarray(corners, dtype=np.float32).reshape(-1, 2)
                if ids_1d.size == 0 or corners_2d.size == 0:
                    continue

                valid = (ids_1d >= 0) & (ids_1d <= max_id)
                ids_1d = ids_1d[valid]
                corners_2d = corners_2d[valid]
                if ids_1d.size < 4:
                    continue

                objp = board_obj[ids_1d].reshape(-1, 1, 3)
                imgp = corners_2d.reshape(-1, 1, 2)
                objpoints.append(objp)
                imgpoints.append(imgp)

            if len(objpoints) < 3:
                raise RuntimeError(
                    "Not enough valid ChArUco detections to run cv2.calibrateCamera(). "
                    "Capture more images with the board filling the view and in varied poses."
                )

            rms, K, dist, *_ = cv2.calibrateCamera(objpoints, imgpoints, image_size, None, None)
            return rms, K, dist

        rmsL, K_L, dist_L = _calibrate_charuco(all_corners_L, all_ids_L)
        rmsR, K_R, dist_R = _calibrate_charuco(all_corners_R, all_ids_R)

        criteria = (cv2.TERM_CRITERIA_MAX_ITER + cv2.TERM_CRITERIA_EPS, 100, 1e-5)
        flags = cv2.CALIB_FIX_INTRINSIC

        rmsStereo, _, _, _, _, R, T, E, F = cv2.stereoCalibrate(
            objectPoints=st_objpoints,
            imagePoints1=st_imgpointsL,
            imagePoints2=st_imgpointsR,
            cameraMatrix1=K_L,
            distCoeffs1=dist_L,
            cameraMatrix2=K_R,
            distCoeffs2=dist_R,
            imageSize=image_size,
            criteria=criteria,
            flags=flags,
        )

        R_flags = (cv2.CALIB_ZERO_DISPARITY if zero_disparity else 0) if rectify_flags is None else int(rectify_flags)
        R1, R2, P1, P2, Q, _, _ = cv2.stereoRectify(
            K_L, dist_L, K_R, dist_R,
            image_size,
            R, T,
            flags=R_flags,
            alpha=float(alpha),
        )

        if diagnostics:
            try:
                baseline = float(np.linalg.norm(T.reshape(-1)))
            except Exception:
                baseline = float("nan")
            print(f"[stereo] baseline(norm(T)) ~ {baseline:.3f} (units follow your board mm config)")
            try:
                print(f"[stereoRectify] P1 cx,cy=({float(P1[0,2]):.2f},{float(P1[1,2]):.2f}) | P2 cx,cy=({float(P2[0,2]):.2f},{float(P2[1,2]):.2f})")
            except Exception:
                pass

        mapLx, mapLy = cv2.initUndistortRectifyMap(K_L, dist_L, R1, P1, image_size, cv2.CV_32FC1)
        mapRx, mapRy = cv2.initUndistortRectifyMap(K_R, dist_R, R2, P2, image_size, cv2.CV_32FC1)

        if diagnostics:
            print_intrinsics_sanity(K_L, image_size, name="left")
            print_intrinsics_sanity(K_R, image_size, name="right")
            print(f"[stereo] rms_left={float(rmsL):.6f} rms_right={float(rmsR):.6f} rms_stereo={float(rmsStereo):.6f}")
            print_map_oob(mapLx, mapLy, (image_size[1], image_size[0]), name="mapL")
            print_map_oob(mapRx, mapRy, (image_size[1], image_size[0]), name="mapR")

        res = StereoCalibResult(
            image_size=image_size,
            K_left=K_L, dist_left=dist_L, rms_left=float(rmsL),
            K_right=K_R, dist_right=dist_R, rms_right=float(rmsR),
            R=R, T=T, E=E, F=F, rms_stereo=float(rmsStereo),
            R1=R1, R2=R2, P1=P1, P2=P2, Q=Q,
            mapLx=mapLx, mapLy=mapLy, mapRx=mapRx, mapRy=mapRy,
        )

        out_dir = Path(out_dir)
        out_dir.mkdir(parents=True, exist_ok=True)
        save_intrinsics_left(out_dir, image_size, K_L, dist_L)
        save_intrinsics_right(out_dir, image_size, K_R, dist_R)
        save_intrinsics_stereo(out_dir, image_size, K_L, dist_L, K_R, dist_R, charuco_spec=self.charuco_spec)
        save_stereo_params(out_dir, image_size, K_L, dist_L, K_R, dist_R, R, T, E, F, rmsL, rmsR, rmsStereo, charuco_spec=self.charuco_spec)
        save_rectify_maps(out_dir, image_size, mapLx, mapLy, mapRx, mapRy, Q, charuco_spec=self.charuco_spec)

        return res


def swap_stereo_left_right(
    stereo_yml_in: str | Path,
    stereo_yml_out: str | Path,
) -> None:
    stereo_yml_in = Path(stereo_yml_in)
    stereo_yml_out = Path(stereo_yml_out)

    fs = cv2.FileStorage(str(stereo_yml_in), cv2.FILE_STORAGE_READ)
    K_L = fs.getNode("K_left").mat()
    dist_L = fs.getNode("dist_left").mat()
    K_R = fs.getNode("K_right").mat()
    dist_R = fs.getNode("dist_right").mat()
    R = fs.getNode("R").mat()
    T = fs.getNode("T").mat()
    rmsL = float(fs.getNode("rms_left").real()) if not fs.getNode("rms_left").empty() else float("nan")
    rmsR = float(fs.getNode("rms_right").real()) if not fs.getNode("rms_right").empty() else float("nan")
    rmsS = float(fs.getNode("rms_stereo").real()) if not fs.getNode("rms_stereo").empty() else float("nan")
    fs.release()

    if any(x is None for x in [K_L, dist_L, K_R, dist_R, R, T]):
        raise RuntimeError(f"Missing required nodes in: {stereo_yml_in}")

    R2 = R.T
    T2 = (-R.T @ T.reshape(3, 1)).reshape(3, 1)

    out = cv2.FileStorage(str(stereo_yml_out), cv2.FILE_STORAGE_WRITE)
    out.write("K_left", K_R)
    out.write("dist_left", dist_R)
    out.write("K_right", K_L)
    out.write("dist_right", dist_L)
    out.write("R", R2)
    out.write("T", T2)
    out.write("rms_left", rmsR)
    out.write("rms_right", rmsL)
    out.write("rms_stereo", rmsS)
    out.release()

    print(f"[swap_stereo_left_right] wrote: {stereo_yml_out}")
