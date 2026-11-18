# Adds the game's Swift files to the generated Xcode project and points the storyboard at GameViewController.
# Usage: ruby ci/add_native.rb
require 'xcodeproj'
root = File.expand_path('..', __dir__)
proj_path = File.join(root, 'ios/App/App.xcodeproj')
project = Xcodeproj::Project.open(proj_path)
target = project.targets.find { |t| t.name == 'App' } or abort 'App target not found'
group = project.main_group.find_subpath('App', false) || project.main_group
%w[CloudSavePlugin.swift GameCenterPlugin.swift RadioPlugin.swift ReviewPlugin.swift GameViewController.swift].each do |name|
  dest = File.join(root, 'ios/App/App', name)
  FileUtils.cp(File.join(root, 'ci/native', name), dest)
  next if group.files.any? { |f| f.path == name }
  ref = group.new_reference(name)
  target.source_build_phase.add_file_reference(ref)
end
project.save
sb = File.join(root, 'ios/App/App/Base.lproj/Main.storyboard')
s = File.read(sb)
s2 = s.sub(/customClass="CAPBridgeViewController" customModule="Capacitor"/, 'customClass="GameViewController" customModule="App" customModuleProvider="target"')
abort 'storyboard view controller not found' if s2 == s && !s.include?('GameViewController')
File.write(sb, s2)
puts 'Native code added: CloudSavePlugin, GameCenterPlugin, RadioPlugin, ReviewPlugin, GameViewController'
