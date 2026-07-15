#!/usr/bin/env swift

import AppKit
import Foundation
import Vision

struct Line: Codable {
  let text: String
  let x: Double
  let y: Double
  let width: Double
  let height: Double
}

struct Result: Codable {
  let path: String
  let mode: String
  let text: String
  let lines: [Line]
}

func usage() -> Never {
  FileHandle.standardError.write(
    Data("Usage: ocr-picture-book.swift [--columns] image.png\n".utf8)
  )
  exit(2)
}

var arguments = Array(CommandLine.arguments.dropFirst())
let columns = arguments.first == "--columns"
if columns { arguments.removeFirst() }
guard arguments.count == 1 else { usage() }

let path = arguments[0]
let url = URL(fileURLWithPath: path)
guard
  let image = NSImage(contentsOf: url),
  let cgImage = image.cgImage(forProposedRect: nil, context: nil, hints: nil)
else {
  FileHandle.standardError.write(Data("Could not load image: \(path)\n".utf8))
  exit(1)
}

let request = VNRecognizeTextRequest()
request.recognitionLevel = .accurate
request.usesLanguageCorrection = true
request.recognitionLanguages = ["en-GB", "en-US"]
request.minimumTextHeight = 0.008

let handler = VNImageRequestHandler(cgImage: cgImage)
do {
  try handler.perform([request])
} catch {
  FileHandle.standardError.write(Data("OCR failed: \(error)\n".utf8))
  exit(1)
}

let lines = (request.results ?? []).compactMap { observation -> Line? in
  guard let candidate = observation.topCandidates(1).first else { return nil }
  let box = observation.boundingBox
  return Line(
    text: candidate.string,
    x: box.origin.x,
    y: box.origin.y,
    width: box.width,
    height: box.height
  )
}

func readingOrder(_ values: [Line]) -> [Line] {
  values.sorted { left, right in
    let verticalTolerance = max(left.height, right.height) * 0.55
    if abs(left.y - right.y) > verticalTolerance { return left.y > right.y }
    return left.x < right.x
  }
}

let ordered: [Line]
if columns {
  let left = lines.filter { $0.x + ($0.width / 2) < 0.5 }
  let right = lines.filter { $0.x + ($0.width / 2) >= 0.5 }
  ordered = readingOrder(left) + readingOrder(right)
} else {
  ordered = readingOrder(lines)
}

let output = Result(
  path: path,
  mode: columns ? "columns" : "single",
  text: ordered.map(\.text).joined(separator: "\n"),
  lines: ordered
)
let encoder = JSONEncoder()
encoder.outputFormatting = [.prettyPrinted, .sortedKeys, .withoutEscapingSlashes]
do {
  let data = try encoder.encode(output)
  FileHandle.standardOutput.write(data)
  FileHandle.standardOutput.write(Data("\n".utf8))
} catch {
  FileHandle.standardError.write(Data("Could not encode OCR result: \(error)\n".utf8))
  exit(1)
}
