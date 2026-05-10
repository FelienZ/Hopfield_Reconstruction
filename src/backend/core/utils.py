import cv2
import numpy as np
import base64
from PIL import Image
from io import BytesIO
from skimage.filters import threshold_otsu
from skimage.morphology import skeletonize

def preprocess_image(image_bytes: bytes, target_size=(30, 30)):
    """
    Processes raw image bytes strictly according to MC-HNN protocol:
    1. Decode to Grayscale
    2. Center Crop 120x120
    3. Resize to 30x30
    4. Binarization (Otsu Threshold)
    5. Skeletonize
    6. Bipolar mapping (+1 for ridge, -1 for background)
    
    Returns the flattened bipolar array (900,).
    """
    # 1. Decode bytes to numpy array then to cv2 image
    np_arr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(np_arr, cv2.IMREAD_GRAYSCALE)
    
    if img is None:
        raise ValueError("Invalid image file format")
        
    # 2. Center Crop 120x120
    h, w = img.shape
    center_y, center_x = h // 2, w // 2
    crop_size = 120
    half_crop = crop_size // 2
    
    y1, y2 = max(0, center_y - half_crop), min(h, center_y + half_crop)
    x1, x2 = max(0, center_x - half_crop), min(w, center_x + half_crop)
    cropped = img[y1:y2, x1:x2]
    
    # 3. Resize to 30x30
    resized = cv2.resize(cropped, target_size, interpolation=cv2.INTER_AREA)
    
    # 4. Binarization (Otsu Threshold)
    thresh = threshold_otsu(resized)
    ridge_binary = resized < thresh # Assuming ridge is dark
    
    # 5. Skeletonize
    skeleton = skeletonize(ridge_binary)
    
    # 6. Bipolar mapping (+1 for ridge, -1 for background)
    bipolar_pattern = np.where(skeleton, 1, -1).flatten()
    
    return bipolar_pattern

def array_to_base64(bipolar_array: np.ndarray, shape=(30, 30)) -> str:
    """
    Converts a 1D bipolar array (-1, 1) back into a Base64-encoded PNG image string.
    """
    # 1. Reshape and map to (0, 255)
    img_array = np.where(bipolar_array == 1, 255, 0).astype(np.uint8).reshape(shape)
    
    # 2. Convert to PIL Image
    pil_img = Image.fromarray(img_array, mode='L')
    
    # 3. Encode to Base64
    buffered = BytesIO()
    pil_img.save(buffered, format="PNG")
    img_str = base64.b64encode(buffered.getvalue()).decode("utf-8")
    
    # 4. Return formatted Data URI
    return f"data:image/png;base64,{img_str}"
