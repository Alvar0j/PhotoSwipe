#import <Capacitor/Capacitor.h>
#import <Foundation/Foundation.h>

// Define the plugin using the macro
CAP_PLUGIN(PhotoLibraryPlugin, "PhotoLibraryPlugin",
           CAP_PLUGIN_METHOD(getPhotos, CAPPluginReturnPromise);
           CAP_PLUGIN_METHOD(getPhotoThumbnail, CAPPluginReturnPromise);
           CAP_PLUGIN_METHOD(deletePhoto, CAPPluginReturnPromise);)
