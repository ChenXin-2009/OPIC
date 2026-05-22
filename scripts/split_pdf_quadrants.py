"""
Split each page of a PDF into 4 quadrants (2x2 grid).
Each quadrant becomes a full-page output, preserving vector content (text as text, not rasterized).
Uses PyMuPDF's show_pdf_page() which internally creates Form XObjects - preserves vectors.
"""
import fitz
import sys
import os

def split_pdf_quadrants(input_path, output_path):
    """Split each PDF page into 4 quadrants, each becoming a full page."""
    
    src_doc = fitz.open(input_path)
    out_doc = fitz.open()
    
    page_width = src_doc[0].rect.width
    page_height = src_doc[0].rect.height
    mid_x = page_width / 2
    mid_y = page_height / 2
    
    # 4 quadrants: TL, TR, BL, BR
    quadrants = [
        fitz.Rect(0, 0, mid_x, mid_y),              # Top-left
        fitz.Rect(mid_x, 0, page_width, mid_y),      # Top-right
        fitz.Rect(0, mid_y, mid_x, page_height),      # Bottom-left
        fitz.Rect(mid_x, mid_y, page_width, page_height),  # Bottom-right
    ]
    
    quadrant_labels = ["TL", "TR", "BL", "BR"]
    
    total_in = len(src_doc)
    total_out = total_in * 4
    
    print(f"Source pages: {total_in}")
    print(f"Output pages: {total_out}")
    print(f"Page size: {page_width:.0f} x {page_height:.0f}")
    print(f"Quadrant size: {mid_x:.1f} x {mid_y:.1f}")
    print("=" * 50)
    
    for src_page_num in range(total_in):
        for qi, qrect in enumerate(quadrants):
            out_page = out_doc.new_page(width=page_width, height=page_height)
            
            # show_pdf_page() preserves vector content (text, lines, etc.)
            # via internal Form XObject creation - NOT rasterization.
            out_page.show_pdf_page(
                out_page.rect,   # Fill the entire output page
                src_doc,         # Source document
                src_page_num,    # Source page number
                clip=qrect,      # Only show this quadrant of the source
                keep_proportion=True
            )
            
            # Label each quadrant page
            label = f"P{src_page_num+1}_{quadrant_labels[qi]}"
        
        if (src_page_num + 1) % 5 == 0 or src_page_num == total_in - 1:
            print(f"  Processed page {src_page_num + 1}/{total_in}")
    
    out_doc.save(output_path, garbage=4, deflate=True, clean=True)
    src_doc.close()
    out_doc.close()
    
    out_size = os.path.getsize(output_path)
    print(f"\nDone! {total_out} pages written to:")
    print(f"  {output_path}")
    print(f"  Size: {out_size / 1024 / 1024:.1f} MB")
    print(f"  Vector content preserved (text remains selectable/searchable).")


if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python split_pdf_quadrants.py <input.pdf> <output.pdf>")
        sys.exit(1)
    split_pdf_quadrants(sys.argv[1], sys.argv[2])
