// import 'dart:async';
// import 'dart:io';
// import 'package:flutter/material.dart';
// import 'package:webview_flutter/webview_flutter.dart';

// class PayPalWebView extends StatefulWidget {
//   final String approvalUrl;
//   final String returnUrl;
//   final String cancelUrl;

//   const PayPalWebView({
//     Key? key,
//     required this.approvalUrl,
//     required this.returnUrl,
//     required this.cancelUrl,
//   }) : super(key: key);

//   @override
//   State<PayPalWebView> createState() => _PayPalWebViewState();
// }

// class _PayPalWebViewState extends State<PayPalWebView> {
//   late final WebViewController _controller;
//   bool _isLoading = true;
//   String _currentUrl = '';

//   @override
//   void initState() {
//     super.initState();

//     // Initialize WebView
//     _controller = WebViewController();
//     _initWebViewController();
//   }

//   Future<void> _initWebViewController() async {
//     await _controller.setJavaScriptMode(JavaScriptMode.unrestricted);
//     await _controller.setBackgroundColor(Colors.white);

//     _controller.setNavigationDelegate(
//       NavigationDelegate(
//         onPageStarted: (url) {
//           if (mounted) {
//             setState(() {
//               _isLoading = true;
//               _currentUrl = url;
//             });
//           }

//           // Handle PayPal navigation
//           _handleNavigation(url);
//         },
//         onPageFinished: (url) {
//           if (mounted) {
//             setState(() {
//               _isLoading = false;
//               _currentUrl = url;
//             });
//           }
//         },
//         onWebResourceError: (error) {
//           print('WebView Error: ${error.description}');
//         },
//         onNavigationRequest: (NavigationRequest request) {
//           // Handle PayPal return/cancel URLs
//           if (_handleNavigation(request.url)) {
//             return NavigationDecision.prevent;
//           }
//           return NavigationDecision.navigate;
//         },
//       ),
//     );

//     try {
//       await _controller.loadRequest(Uri.parse(widget.approvalUrl));
//     } catch (e) {
//       print('Error loading PayPal URL: $e');
//       if (mounted) {
//         ScaffoldMessenger.of(context).showSnackBar(
//           SnackBar(content: Text('Error loading payment page: $e')),
//         );
//       }
//     }
//   }

//   bool _handleNavigation(String url) {
//     // Success case - PayPal redirected to success URL
//     if (url.startsWith(widget.returnUrl)) {
//       Navigator.of(context).pop(true);
//       return true;
//     }

//     // Cancelled case - PayPal redirected to cancel URL
//     if (url.startsWith(widget.cancelUrl)) {
//       Navigator.of(context).pop(false);
//       return true;
//     }

//     return false;
//   }

//   @override
//   Widget build(BuildContext context) {
//     return WillPopScope(
//       onWillPop: () async {
//         // Confirm before leaving
//         final shouldPop = await showDialog<bool>(
//           context: context,
//           builder: (context) => AlertDialog(
//             title: const Text('Cancel Payment?'),
//             content: const Text(
//                 'If you go back now, your payment will be cancelled.'),
//             actions: [
//               TextButton(
//                 onPressed: () => Navigator.of(context).pop(false),
//                 child: const Text('Stay'),
//               ),
//               TextButton(
//                 onPressed: () {
//                   Navigator.of(context).pop(true);
//                   Navigator.of(context).pop(
//                       false); // Return to previous screen with result "false"
//                 },
//                 child: const Text('Cancel Payment'),
//               ),
//             ],
//           ),
//         );
//         return shouldPop ?? false;
//       },
//       child: Scaffold(
//         appBar: AppBar(
//           title: const Text('PayPal Payment'),
//           leading: IconButton(
//             icon: const Icon(Icons.close),
//             onPressed: () {
//               showDialog<bool>(
//                 context: context,
//                 builder: (context) => AlertDialog(
//                   title: const Text('Cancel Payment?'),
//                   content: const Text(
//                       'Are you sure you want to cancel this payment?'),
//                   actions: [
//                     TextButton(
//                       onPressed: () => Navigator.of(context).pop(false),
//                       child: const Text('No'),
//                     ),
//                     TextButton(
//                       onPressed: () {
//                         Navigator.of(context).pop(true);
//                         Navigator.of(context)
//                             .pop(false); // Return to payment screen
//                       },
//                       child: const Text('Yes'),
//                     ),
//                   ],
//                 ),
//               );
//             },
//           ),
//           actions: [
//             IconButton(
//               icon: const Icon(Icons.refresh),
//               onPressed: () => _controller.reload(),
//             ),
//           ],
//         ),
//         body: Stack(
//           children: [
//             WebViewWidget(
//               controller: _controller,
//             ),
//             if (_isLoading)
//               const Center(
//                 child: CircularProgressIndicator(),
//               ),
//           ],
//         ),
//         bottomNavigationBar:
//             _isLoading ? LinearProgressIndicator() : const SizedBox.shrink(),
//       ),
//     );
//   }
// }
