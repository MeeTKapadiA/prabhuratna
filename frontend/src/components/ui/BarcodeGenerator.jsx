import React, { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';
import Button from './Button';
import { Download, Printer } from 'lucide-react';
import { formatCurrency } from '../../services/calcService';

export default function BarcodeGenerator({
  value,
  productName = '',
  price = 0,
  width = 2,
  height = 50,
  displayValue = true,
  className = '',
  showActions = false
}) {
  const svgRef = useRef(null);

  useEffect(() => {
    if (svgRef.current && value) {
      try {
        JsBarcode(svgRef.current, value, {
          format: 'CODE128',
          width: width,
          height: height,
          displayValue: displayValue,
          font: 'monospace',
          fontSize: 14,
          margin: 5,
          background: 'transparent',
          lineColor: '#ffffff' // default for dark mode or dynamically handled
        });
      } catch (err) {
        console.error('Barcode render error:', err);
      }
    }
  }, [value, width, height, displayValue]);

  const handleDownloadPNG = () => {
    if (!svgRef.current) return;
    const svgElement = svgRef.current;
    const svgData = new XMLSerializer().serializeToString(svgElement);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      canvas.width = img.width + 20;
      canvas.height = img.height + 20;
      // White background for barcode image
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
  };

  const handleDownloadSVG = () => {
    if (!svgRef.current) return;
    const svgData = new XMLSerializer().serializeToString(svgRef.current);
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const svgUrl = URL.createObjectURL(svgBlob);
    const downloadLink = document.createElement('a');
    downloadLink.href = svgUrl;
    downloadLink.download = `barcode_${value}.svg`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
  };

  const handlePrintLabel = () => {
    if (!svgRef.current) return;
    const svgData = new XMLSerializer().serializeToString(svgRef.current);
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
              max-width: 300px;
            }
            .store-name {
              font-size: 12px;
              font-weight: bold;
              text-transform: uppercase;
              letter-spacing: 1px;
            }
            .product-name {
              font-size: 14px;
              font-weight: bold;
              margin: 5px 0;
            }
            .price {
              font-size: 16px;
              font-weight: bold;
              margin-top: 5px;
            }
            svg {
              max-width: 100%;
              height: auto;
            }
          </style>
        </head>
        <body onload="window.print(); window.close();">
          <div class="label-box">
            <div class="store-name">Prabhuratna Metals & Appliances</div>
            <div class="product-name">${productName}</div>
            ${svgData}
            ${price ? `<div class="price">MRP: ${formatCurrency(price)}</div>` : ''}
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className={`flex flex-col items-center gap-3 ${className}`}>
      <div className="p-3 bg-white rounded-xl shadow-inner inline-flex items-center justify-center">
        {/* Render barcode with black lines on white container background */}
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
      </div>

      {showActions && (
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Button onClick={handleDownloadPNG} variant="secondary" size="sm" icon={Download}>
            PNG
          </Button>
          <Button onClick={handleDownloadSVG} variant="secondary" size="sm" icon={Download}>
            SVG
          </Button>
          <Button onClick={handlePrintLabel} variant="primary" size="sm" icon={Printer}>
            Print Label
          </Button>
        </div>
      )}
    </div>
  );
}
