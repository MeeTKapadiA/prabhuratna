import React, { useEffect, useRef, useState } from 'react';
import JsBarcode from 'jsbarcode';
import QRCode from 'qrcode';
import Button from './Button';
import { Download, Printer, QrCode as QrIcon, Barcode as BarcodeIcon } from 'lucide-react';
import { formatCurrency } from '../../services/calcService';

export default function BarcodeGenerator({
  value,
  productName = '',
  price = 0,
  sku = '',
  width = 2,
  height = 50,
  displayValue = true,
  className = '',
  showActions = false
}) {
  const [codeType, setCodeType] = useState('1d'); // '1d' or 'qr'
  const svgRef = useRef(null);
  const canvasQrRef = useRef(null);

  const qrFormattedText = `STORE: Prabhuratna Metals & Appliances\nPRODUCT: ${productName || 'Product'}\nSKU: ${sku || value}\nBARCODE: ${value}\nPRICE: Rs. ${price}`;

  useEffect(() => {
    if (codeType === '1d' && svgRef.current && value) {
      try {
        JsBarcode(svgRef.current, value, {
          format: 'CODE128',
          width: width,
          height: height,
          displayValue: displayValue,
          font: 'monospace',
          fontSize: 14,
          margin: 5,
          background: '#ffffff',
          lineColor: '#000000'
        });
      } catch (err) {
        console.error('1D Barcode render error:', err);
      }
    } else if (codeType === 'qr' && canvasQrRef.current && value) {
      QRCode.toCanvas(canvasQrRef.current, qrFormattedText, {
        width: 180,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff'
        }
      }, (err) => {
        if (err) console.error('QR render error:', err);
      });
    }
  }, [codeType, value, productName, price, sku, width, height, displayValue]);

  const handleDownloadPNG = () => {
    if (codeType === '1d' && svgRef.current) {
      const svgElement = svgRef.current;
      const svgData = new XMLSerializer().serializeToString(svgElement);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        canvas.width = img.width + 20;
        canvas.height = img.height + 20;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 10, 10);

        const pngFile = canvas.toDataURL('image/png');
        const downloadLink = document.createElement('a');
        downloadLink.href = pngFile;
        downloadLink.download = `barcode_${value}.png`;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
      };

      img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
    } else if (codeType === 'qr' && canvasQrRef.current) {
      const pngFile = canvasQrRef.current.toDataURL('image/png');
      const downloadLink = document.createElement('a');
      downloadLink.href = pngFile;
      downloadLink.download = `qrcode_${value}.png`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
    }
  };

  const handlePrintLabel = () => {
    let codeImgHtml = '';
    if (codeType === '1d' && svgRef.current) {
      const svgData = new XMLSerializer().serializeToString(svgRef.current);
      codeImgHtml = `<div class="code-wrapper">${svgData}</div>`;
    } else if (codeType === 'qr' && canvasQrRef.current) {
      const qrUrl = canvasQrRef.current.toDataURL('image/png');
      codeImgHtml = `<img src="${qrUrl}" style="width:140px;height:140px;margin:6px auto;display:block;" />`;
    }

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Print Label - ${productName || value}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              text-align: center;
              padding: 20px;
              margin: 0;
            }
            .label-box {
              border: 2px dashed #000;
              padding: 15px;
              display: inline-block;
              border-radius: 8px;
              max-width: 320px;
              background: #fff;
            }
            .store-name {
              font-size: 13px;
              font-weight: bold;
              text-transform: uppercase;
              letter-spacing: 1px;
              color: #111;
            }
            .product-name {
              font-size: 15px;
              font-weight: bold;
              margin: 6px 0 2px;
              color: #000;
            }
            .sku-info {
              font-size: 11px;
              color: #555;
              margin-bottom: 6px;
            }
            .price {
              font-size: 16px;
              font-weight: bold;
              margin-top: 6px;
              color: #C0392B;
            }
            svg {
              max-width: 100%;
              height: auto;
            }
          </style>
        </head>
        <body onload="window.print(); window.close();">
          <div class="label-box">
            <div class="store-name">PRABHURATNA METALS</div>
            <div class="product-name">${productName}</div>
            ${sku ? `<div class="sku-info">SKU: ${sku} | Barcode: ${value}</div>` : ''}
            ${codeImgHtml}
            ${price ? `<div class="price">MRP: ${formatCurrency(price)}</div>` : ''}
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className={`flex flex-col items-center gap-3 ${className}`}>
      {/* Code Type Switcher */}
      <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-[#121417] rounded-xl border border-slate-200 dark:border-[#2D3138]">
        <button
          type="button"
          onClick={() => setCodeType('1d')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            codeType === '1d'
              ? 'bg-white dark:bg-[#1E2126] text-slate-900 dark:text-[#F1F1F1] shadow-xs'
              : 'text-slate-500 hover:text-slate-900 dark:hover:text-[#F1F1F1]'
          }`}
        >
          <BarcodeIcon className="w-3.5 h-3.5" /> 1D Laser Barcode
        </button>
        <button
          type="button"
          onClick={() => setCodeType('qr')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            codeType === 'qr'
              ? 'bg-[#C0392B] dark:bg-[#E74C3C] text-white shadow-xs'
              : 'text-slate-500 hover:text-slate-900 dark:hover:text-[#F1F1F1]'
          }`}
        >
          <QrIcon className="w-3.5 h-3.5" /> Smart Product QR Code
        </button>
      </div>

      {/* Code Preview Container */}
      <div className="p-4 bg-white rounded-2xl border border-slate-200 dark:border-[#2D3138] shadow-xs flex flex-col items-center justify-center min-w-[220px]">
        {codeType === '1d' ? (
          <svg
            ref={(node) => {
              svgRef.current = node;
              if (node && value) {
                try {
                  JsBarcode(node, value, {
                    format: 'CODE128',
                    width: width,
                    height: height,
                    displayValue: displayValue,
                    font: 'monospace',
                    fontSize: 14,
                    margin: 5,
                    background: '#ffffff',
                    lineColor: '#000000'
                  });
                } catch (e) {}
              }
            }}
          />
        ) : (
          <div className="flex flex-col items-center gap-2">
            <canvas ref={canvasQrRef} className="rounded-lg" />
            <p className="text-[11px] text-slate-500 font-medium text-center max-w-[200px]">
              Scan with phone camera or Play Store app to view full product details
            </p>
          </div>
        )}
      </div>

      {showActions && (
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Button onClick={handleDownloadPNG} variant="secondary" size="sm" icon={Download}>
            Download {codeType === '1d' ? 'Barcode' : 'QR Code'}
          </Button>
          <Button onClick={handlePrintLabel} variant="primary" size="sm" icon={Printer}>
            Print Store Label
          </Button>
        </div>
      )}
    </div>
  );
}
