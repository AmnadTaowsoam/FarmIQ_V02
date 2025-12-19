#!/usr/bin/env python3
"""
Simple test script for the Vision Inference Service
"""
import requests
import json
import os
from pathlib import Path

# Service configuration
BASE_URL = "http://localhost:6403"
API_BASE = f"{BASE_URL}/api/v1/inference"

def test_health():
    """Test health endpoint"""
    print("Testing health endpoint...")
    try:
        response = requests.get(f"{API_BASE}/health")
        print(f"Health check: {response.status_code}")
        print(f"Response: {response.json()}")
        return response.status_code == 200
    except Exception as e:
        print(f"Health check failed: {e}")
        return False

def test_models():
    """Test models endpoint"""
    print("\nTesting models endpoint...")
    try:
        response = requests.get(f"{API_BASE}/models")
        print(f"Models: {response.status_code}")
        print(f"Response: {response.json()}")
        return response.status_code == 200
    except Exception as e:
        print(f"Models endpoint failed: {e}")
        return False

def test_predict():
    """Test prediction endpoint with a sample image"""
    print("\nTesting prediction endpoint...")
    
    # Create a simple test image (you would replace this with a real microplate image)
    test_image_path = "test_image.jpg"
    
    # For testing, we'll create a simple colored image
    import cv2
    import numpy as np
    
    # Create a simple test image (640x640 with some colored rectangles)
    img = np.zeros((640, 640, 3), dtype=np.uint8)
    img[100:200, 100:200] = [0, 255, 0]  # Green rectangle
    img[300:400, 300:400] = [255, 0, 0]  # Red rectangle
    cv2.imwrite(test_image_path, img)
    
    try:
        with open(test_image_path, 'rb') as f:
            files = {'file': ('test_image.jpg', f, 'image/jpeg')}
            data = {
                'sample_no': 'TEST001',
                'submission_no': 'SUB001',
                'description': 'Test prediction',
                'confidence_threshold': 0.3
            }
            
            response = requests.post(f"{API_BASE}/predict", files=files, data=data)
            print(f"Prediction: {response.status_code}")
            
            if response.status_code == 200:
                result = response.json()
                print(f"Success: {result.get('success', False)}")
                if result.get('success'):
                    run_id = result['data']['run_id']
                    print(f"Run ID: {run_id}")
                    print(f"Status: {result['data']['status']}")
                    print(f"Processing time: {result['data']['processing_time_ms']}ms")
                    
                    # Test status endpoint
                    status_response = requests.get(f"{API_BASE}/status/{run_id}")
                    print(f"Status check: {status_response.status_code}")
                    if status_response.status_code == 200:
                        status_data = status_response.json()
                        print(f"Status data: {status_data}")
                
                return True
            else:
                print(f"Error response: {response.text}")
                return False
                
    except Exception as e:
        print(f"Prediction test failed: {e}")
        return False
    finally:
        # Clean up test image
        if os.path.exists(test_image_path):
            os.remove(test_image_path)

def main():
    """Run all tests"""
    print("Vision Inference Service Test Suite")
    print("=" * 40)
    
    tests = [
        ("Health Check", test_health),
        ("Models Endpoint", test_models),
        ("Prediction", test_predict),
    ]
    
    results = []
    for test_name, test_func in tests:
        print(f"\n{'=' * 20} {test_name} {'=' * 20}")
        try:
            result = test_func()
            results.append((test_name, result))
            print(f"✅ {test_name}: {'PASSED' if result else 'FAILED'}")
        except Exception as e:
            print(f"❌ {test_name}: ERROR - {e}")
            results.append((test_name, False))
    
    print(f"\n{'=' * 40}")
    print("Test Summary:")
    for test_name, result in results:
        status = "✅ PASSED" if result else "❌ FAILED"
        print(f"  {test_name}: {status}")
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    print(f"\nOverall: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All tests passed!")
    else:
        print("⚠️  Some tests failed. Check the service configuration and logs.")

if __name__ == "__main__":
    main()
