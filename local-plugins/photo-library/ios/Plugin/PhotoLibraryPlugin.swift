import Foundation
import Capacitor
import Photos
import UIKit

@objc(PhotoLibraryPlugin)
public class PhotoLibraryPlugin: CAPPlugin {
    
    @objc func getPhotos(_ call: CAPPluginCall) {
        let limit = call.getInt("limit") ?? 50
        
        checkAuthorization { authorized in
            if !authorized {
                call.reject("Access denied")
                return
            }
            
            let fetchOptions = PHFetchOptions()
            fetchOptions.sortDescriptors = [NSSortDescriptor(key: "creationDate", ascending: false)]
            fetchOptions.fetchLimit = limit
            
            let fetchResult = PHAsset.fetchAssets(with: .image, options: fetchOptions)
            var photos: [[String: Any]] = []
            
            fetchResult.enumerateObjects { (asset, _, _) in
                photos.append([
                    "id": asset.localIdentifier,
                    // Return raw creation date
                     "date": ISO8601DateFormatter().string(from: asset.creationDate ?? Date()),
                     "localIdentifier": asset.localIdentifier
                ])
            }
            
            call.resolve([
                "photos": photos
            ])
        }
    }
    
    @objc func getPhotoThumbnail(_ call: CAPPluginCall) {
        guard let id = call.getString("id") else {
            call.reject("No ID provided")
            return
        }
        
        let fetchResult = PHAsset.fetchAssets(withLocalIdentifiers: [id], options: nil)
        guard let asset = fetchResult.firstObject else {
            call.reject("Asset not found")
            return
        }
        
        // Request a relatively high quality thumbnail for the swipe card
        let manager = PHImageManager.default()
        let options = PHImageRequestOptions()
        options.isSynchronous = false
        options.deliveryMode = .highQualityFormat
        options.isNetworkAccessAllowed = true // Allow downloading from iCloud
        
        // Target size: similar to screen width? 500x700 is decent for phones.
        manager.requestImage(for: asset, targetSize: CGSize(width: 500, height: 700), contentMode: .aspectFill, options: options) { image, _ in
            if let image = image, let data = image.jpegData(compressionQuality: 0.7) {
                let base64 = data.base64EncodedString()
                call.resolve(["base64": base64])
            } else {
                call.reject("Failed to load image")
            }
        }
    }
    
    @objc func deletePhoto(_ call: CAPPluginCall) {
        guard let id = call.getString("id") else {
            call.reject("No ID provided")
            return
        }
        
        let fetchResult = PHAsset.fetchAssets(withLocalIdentifiers: [id], options: nil)
        
        PHPhotoLibrary.shared().performChanges({
            PHAssetChangeRequest.deleteAssets(fetchResult)
        }) { success, error in
            if success {
                call.resolve()
            } else {
                call.reject(error?.localizedDescription ?? "Failed to delete")
            }
        }
    }
    
    private func checkAuthorization(completion: @escaping (Bool) -> Void) {
        let status = PHPhotoLibrary.authorizationStatus(for: .readWrite)
        if status == .authorized || status == .limited {
            completion(true)
        } else if status == .notDetermined {
            PHPhotoLibrary.requestAuthorization(for: .readWrite) { newStatus in
                completion(newStatus == .authorized || newStatus == .limited)
            }
        } else {
            completion(false)
        }
    }
}
