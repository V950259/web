import web_webview from '@ohos.web.webview';

@Entry
@Component
struct Index {
  webviewController: web_webview.WebviewController = new web_webview.WebviewController();

  build() {
    Column() {
      Web({ src: 'https://693a67f7473f52a20ed1636f--lovely-pothos-7062b3.netlify.app/', controller: this.webviewController })
        .domStorageAccess(true)
        .javaScriptAccess(true)
        .width('100%')
        .height('100%')
    }
  }
}
